import Image from "next/image";
import Link from "next/link";
import Footer from "../ui/footer";
import Header from "../ui/header";
import fs from "fs";
import path from "path";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSoundcloud, faSpotify, faYoutube} from '@fortawesome/free-brands-svg-icons'


export default function LinkPage() {
  return (
    <>
      {/* <Header pageName="links"/> */}
      <div className="flex flex-col items-center justify-center mt-8 mb-4">
        <div className="w-32 h-32 rounded-full border-4 border-[color:var(--ring)] mb-1">
          <Image 
            src={"/img/danzieboy.png"}
            width={150}
            height={150}
            alt="icon of danzieboy"
            className="rounded-full border-2"
            style={{ borderColor: "var(--fg)" }}
          />
        </div>
        <h3 className="text-xl font-bold text-center">danzie-links</h3>

      </div>
      <div className="m-3">
        <ul>
          <li className="border border-[color:var(--ring)] rounded-md transition-shadow duration-300 shadow-[0_0_0_0_var(--shadow-inactive)] hover:shadow-[0_12px_30px_var(--shadow-active)]">
            <Link
              href={"https://www.youtube.com/@danzieboy"}
              className="block p-4 flex flex-col items-center justify-center text-center gap-2 text-black"
            >
              <h3 className="text-lg font-semibold">youtube</h3>
              <FontAwesomeIcon icon={faYoutube} className="w-6 h-6" />
            </Link>
          </li>
        </ul>
        <br />

        <ul>
          <li className="border border-[color:var(--ring)] rounded-md transition-shadow duration-300 shadow-[0_0_0_0_var(--shadow-inactive)] hover:shadow-[0_12px_30px_var(--shadow-active)]">
            <Link
              href={"http://soundcloud.com/danzieboy"}
              className="block p-4 flex flex-col items-center justify-center text-center gap-2 text-black"
            >
              <h3 className="text-lg font-semibold">soundcloud</h3>
              <FontAwesomeIcon icon={faSoundcloud} className="w-6 h-6" />
            </Link>
          </li>
        </ul>
        <br />

        <ul>
          <li className="border border-[color:var(--ring)] rounded-md transition-shadow duration-300 shadow-[0_0_0_0_var(--shadow-inactive)] hover:shadow-[0_12px_30px_var(--shadow-active)]">
            <Link
              href={"https://open.spotify.com/artist/2bj33ACLG29rpLEmsumrAs?si=rovJOCDfSGqM-pvmLeOMFg"}
              className="block p-4 flex flex-col items-center justify-center text-center gap-2 text-black"
            >
              <h3 className="text-lg font-semibold">spotify</h3>
              <FontAwesomeIcon icon={faSpotify} className="w-6 h-6" />
            </Link>
          </li>
        </ul>
      </div>
      <div className="flex justify-center items-top min-h-screen">
        <h3>links in progress</h3>
      </div>
      {/* <Footer /> */}
    </>
  )
}
