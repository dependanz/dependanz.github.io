import Header from "@/app/ui/header"
import FrontPage from "@/app/frontpage"
import Footer from "@/app/ui/footer"

export default function Home() {
  return (
    <>
      {/* <h1 className={"text-3xl font-bold"}>
        site in progress.
      </h1> */}
      <Header pageName="home" />
      <FrontPage />
      <Footer />
    </>
  )
}