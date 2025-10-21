import Image from "next/image";
import { sourceCodePro, boldRobotoMono, pubFont} from "./ui/fonts";
import Link from "next/link";
import { FaFilePdf } from "react-icons/fa";

function Publications() {
  const PublicationListItem = ({ href, citation }: { href: string; citation: string }) => (
    <li className="my-2 hover:underline flex items-start">
      <div className="flex-shrink-0 w-4 h-4 mr-1 flex items-center justify-center">
        <FaFilePdf className="w-full h-full"/>
      </div>
      <Link href={href}>
        {citation}
      </Link>
    </li>
  );

  return (
    <div
      className="mt-5 mx-[10%] px-[10px] flex flex-col justify-center border rounded-lg pb-5"
      style={{ borderColor: "var(--fg)" }}
    >
      <div className="flex justify-center">
        <h3 className={`${boldRobotoMono.className} underline text-lg`}>
          Publications
        </h3>
      </div>
      <div className="flex justify-left">
        <ul className={`list-disc list-inside text-sm ${pubFont.className}`}>
          <PublicationListItem
            href="https://dl.acm.org/doi/abs/10.1145/3721250.3743011"
            citation='Serrano, D., Musialski, P. "Disentangled Phoneme-Prosody Mapping for Controllable 3D Facial Animation" (ACM SIGGRAPH Posters), 2025'
          />
          <PublicationListItem
            href="https://arxiv.org/abs/2401.10967"
            citation='Serrano, D., Szymkowiak, J., Musialski, P. "HOSC: A Periodic Activation Function for Preserving Sharp Features in Implicit Neural Representations" (arXiv:2401.10967), 2024.'
          />
          <PublicationListItem
            href="https://arxiv.org/abs/2303.02396"
            citation='Serrano, D., Cartwright, M. "A General Framework for Learning Procedural Audio Models of Environmental Sounds" (arXiv:2303.02396), 2023.'
          />
          <PublicationListItem
            href="https://digitalcommons.njit.edu/theses/2097/"
            citation='Serrano, D. "A Neural Analysis-Synthesis Approach to Learning Procedural Audio Models" (NJIT Thesis 2097), 2022.'
          />
        </ul>
      </div>
    </div>
  )
}

export default function FrontPage() {
  return (
    <>
      <div id="infoContainer" className="w-full flex flex-col justify-center">
        <div className="mt-5 flex justify-center">
            <Image 
              src={"/img/enhancedicon.png"}
              width={150}
              height={150}
              alt="Picture of Danzel Serrano"
              className="rounded-full border-2"
              style={{ borderColor: "var(--fg)" }}
            />
          </div>
          <h1 className={"flex justify-center text-1xl font-bold"}>
            main site in progress.
          </h1>
          <div className={`${sourceCodePro.className} mt-2 text-center whitespace-pre-line`}>
            {"\"Audio-informed Geometry ∥ Geometry-informed Audio\"\nAligning Sound and 3D Motion for Controllable, Physics-Grounded Synthesis"}
          </div>
          <Publications />
      </div>
    </>
  );
}
