import Header from "./ui/header"

export function FrontPage() {

  return (
    <>
      <h1 className={"text-1xl font-bold"}>
        site in progress.
      </h1>
    </>
  );
}

export default function Home() {
  return (
    <>
      {/* <h1 className={"text-3xl font-bold"}>
        site in progress.
      </h1> */}
      <Header pageName="home" />
      <FrontPage />
    </>
  )
}