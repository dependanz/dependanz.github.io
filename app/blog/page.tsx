import Header from "../ui/header";

function BlogContainer() {
  return (
    <>
      <h1 className="flex justify-center">test</h1>
    </>
  )
}

export default function Blog() {
  return (
      <>
        <Header pageName="blog"/>
        <BlogContainer />
        <div className="flex justify-center items-center min-h-screen">
          <h3>blog in progress</h3>
        </div>
      </>
    )
}
