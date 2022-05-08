import Image from 'next/image'

export default function NavigationBar() {
  return (
    <>
      <div className='relative gap-x-2 flex items-center bg-white h-44'>
        <label className='font-flow font-bold text-3xl'>
          meteor
        </label>
        
        <a 
          href={'https://github.com/LanfordCai/meteor'}
          target='_blank' 
          rel='noopener noreferrer'
          className='absolute right-0'>
            <Image src='/github.png' alt='' width={24} height={24} priority />
        </a>
      </div>
    </>
  )
}