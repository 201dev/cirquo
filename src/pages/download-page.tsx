import { Download } from "lucide-react";
import cirquoMark from "@/assets/brand/cirquo-mark.svg";
import { Button } from "@/components/ui/button";

const DOWNLOAD_URL =
  "https://drive.google.com/drive/folders/1bQXwZSktmXFlFZ6nO4owAWIToJs1YteS?usp=drive_link";

export default function DownloadPage() {
  return (
    <section
      aria-labelledby="download-title"
      className="mx-auto max-w-md py-6 text-center sm:py-10"
    >
      <img
        src={cirquoMark}
        alt=""
        width="38"
        height="42"
        className="mx-auto h-16 w-auto"
      />
      <h1
        id="download-title"
        className="mt-5 text-2xl font-bold tracking-[-0.025em] sm:text-3xl"
      >
        Download Cirquo
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        Unduh Cirquo untuk Android melalui Google Drive, lalu pasang aplikasinya
        di perangkatmu.
      </p>

      <div className="mt-7">
        <Button asChild className="h-12 px-6 text-base">
          <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer">
            <Download aria-hidden="true" /> Pasang Cirquo
          </a>
        </Button>
      </div>
    </section>
  );
}
