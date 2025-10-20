import Link from "next/link"
import LightSwitch from "./lightswitch"

function HeaderItem(
    {itemName, url, active = false} : { 
    itemName: string,
    url: string,
    active : boolean
}) {
    return (
        <div className={`pl-4 hover:underline cursor-pointer ${active ? 'underline' : ''}`}>
            <Link href={url}>
                {itemName}
            </Link>
        </div>
    )
}

export default function Header({pageName} : {pageName : string}) {
    // A static full-width header per page
    return (
        <div className="w-full py-1 border-b-2 border-gray-400 flex justify-between items-center">
            <div className="flex">
                <HeaderItem itemName={'danzel serrano'} url={'/'} active={pageName == 'home'}></HeaderItem>
                <div className="pl-4">|</div>
                <HeaderItem itemName={'blog'} url={'/blog'} active={pageName == 'blog'}></HeaderItem>
                <HeaderItem itemName={'cv'} url={'/blog'} active={pageName == 'cv'}></HeaderItem>
            </div>
            <div className="flex space-x-4 pr-3">
                <LightSwitch></LightSwitch>
            </div>
        </div>
    )
}