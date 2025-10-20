import Link from "next/link";
import Header from "../ui/header";

function CVContainer() {
    // Display for a PDF file
    return (
        <div className="cv-container flex flex-col items-center py-4">
            <iframe
            src="/cvmain.pdf"
            width="75%"
            height="800px"
            className="border-3 border-gray-500 rounded-lg"
            title="CV PDF"
            />
        </div>
    );
}

export default function CVPage() {
    return (
        <>
        <Header pageName="cv"/>
        <CVContainer />
        </>
    )
}