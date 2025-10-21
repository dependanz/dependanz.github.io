import { Source_Code_Pro } from 'next/font/google'
import { Cutive_Mono } from 'next/font/google'
import { Nixie_One } from 'next/font/google'
import { Roboto_Mono } from 'next/font/google'

export const sourceCodePro = Source_Code_Pro({
    subsets: ['latin'], 
    weight: ['400'], 
    variable: '--font-source-code-pro'
})
export const cutiveMono = Cutive_Mono({subsets: ['latin'], weight: ['400'], variable: '--font-cutive-mono'})
export const nixieOne = Nixie_One({subsets: ['latin'], weight: ['400'], variable: '--font-nixie-one'})
export const robotoMono = Roboto_Mono({
    subsets: ['latin'], 
    weight: ['400'], 
    variable: '--font-roboto-mono'
})
export const boldRobotoMono = Roboto_Mono({
    subsets: ['latin'],
    weight: ['700'],
    variable: '--font-bold-roboto-mono'
})
export const pubFont = Source_Code_Pro({
    subsets: ['latin'],
    weight: ['400'],
    style: ['italic'],
    variable: '--font-pub-font'
})