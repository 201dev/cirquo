import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, MapPin, Store } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatIdr } from "@/constants/mock-data";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/auth-context";

export default function CheckoutPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const order = useQuery(api.orders.get, orderId && sessionToken ? { orderId: orderId as Id<"orders">, sessionToken } : "skip");
  const createTransaction = useAction(api.payments.createTransaction);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [snapScriptLoaded, setSnapScriptLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!order) return;
    
    if (order.status === "expired" || order.status === "cancelled") {
      toast.error("Waktu pembayaran telah habis atau pesanan dibatalkan.");
      navigate("/orders");
      return;
    }
    
    if (order.status === "paid" || order.status === "picked_up") {
      navigate(`/orders/${orderId}`);
      return;
    }

    // Calculate time left (15 minutes from createdAt)
    const expiryTime = order.createdAt + 15 * 60 * 1000;
    
    const updateTime = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0) {
        clearInterval(timer);
      }
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [order, navigate, orderId]);

  useEffect(() => {
    // Dynamically load Midtrans Snap JS
    const script = document.createElement("script");
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    
    if (!clientKey) {
      console.error("VITE_MIDTRANS_CLIENT_KEY is missing");
      return;
    }
    
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    
    script.onload = () => setSnapScriptLoaded(true);
    script.onerror = () => {
      toast.error("Gagal memuat sistem pembayaran");
    };
    
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!snapScriptLoaded) {
      toast.error("Sistem pembayaran masih dimuat, mohon tunggu sebentar.");
      return;
    }
    
    if (!orderId) return;

    try {
      setIsProcessing(true);
      
      const { snapToken } = await createTransaction({ 
        orderId: orderId as Id<"orders">,
        sessionToken: sessionToken || undefined
      });
      
      // Use Midtrans Snap
      (window as any).snap.pay(snapToken, {
        onSuccess: function() {
          toast.success("Pembayaran berhasil! Menunggu verifikasi...");
          // We don't navigate immediately or update state, let reactive query handle it
        },
        onPending: function() {
          toast.info("Pembayaran tertunda. Silakan selesaikan instruksi pembayaran.");
        },
        onError: function() {
          toast.error("Pembayaran gagal.");
          setIsProcessing(false);
        },
        onClose: function() {
          setIsProcessing(false);
        }
      });
      
    } catch (error: any) {
      toast.error(error.message || "Gagal menginisiasi pembayaran.");
      setIsProcessing(false);
    }
  };

  if (order === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat data pesanan...</p>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-bold mb-2">Pesanan Tidak Ditemukan</h2>
        <p className="text-muted-foreground mb-6">Pesanan yang Anda cari tidak ada atau Anda tidak memiliki akses.</p>
        <Button asChild>
          <Link to="/explore">Kembali Jelajah</Link>
        </Button>
      </div>
    );
  }

  const minutes = timeLeft ? Math.floor(timeLeft / 60) : 0;
  const seconds = timeLeft ? timeLeft % 60 : 0;
  const isExpired = timeLeft === 0;

  return (
    <div className="max-w-md mx-auto pb-24 pt-4 px-4 sm:px-0">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2 mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Selesaikan Pembayaran</h1>
      </div>

      {!isExpired && timeLeft !== null && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Selesaikan pembayaran dalam</p>
            <p className="text-2xl font-bold text-yellow-700 font-mono tracking-wider">
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
          <p className="font-semibold text-destructive">Waktu pembayaran habis</p>
          <p className="text-sm text-destructive/80 mt-1">Pesanan ini telah dibatalkan secara otomatis.</p>
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-card border rounded-xl overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              {order.merchantName}
            </h2>
          </div>
          
          <div className="p-4 flex gap-4">
            <img 
              src={order.image} 
              alt={order.itemName} 
              className="w-20 h-20 rounded-lg object-cover bg-muted"
            />
            <div className="flex-1">
              <h3 className="font-medium leading-tight">{order.itemName}</h3>
              <p className="text-sm text-muted-foreground mt-1">{order.quantity} porsi</p>
              <p className="font-semibold mt-2">{formatIdr(order.totalPrice)}</p>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold">Informasi Pengambilan</h3>
          
          <div className="flex gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Waktu Pengambilan</p>
              <p className="text-muted-foreground">{order.pickupDate}, {order.pickupWindow}</p>
            </div>
          </div>
          
          <div className="flex gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Lokasi Merchant</p>
              <p className="text-muted-foreground">{order.merchantAddress}</p>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold mb-4">Rincian Pembayaran</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Harga per porsi</span>
              <span>{formatIdr(order.totalPrice / order.quantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah</span>
              <span>x {order.quantity}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
              <span>Total Tagihan</span>
              <span>{formatIdr(order.totalPrice)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-8">
        <div className="max-w-md mx-auto">
          <Button 
            className="w-full h-12 text-base font-semibold" 
            onClick={handlePayment}
            disabled={isProcessing || isExpired || !snapScriptLoaded}
          >
            {isProcessing ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memproses...</>
            ) : isExpired ? (
              "Waktu Habis"
            ) : !snapScriptLoaded ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Menyiapkan...</>
            ) : (
              `Bayar ${formatIdr(order.totalPrice)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
