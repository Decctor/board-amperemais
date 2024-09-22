import { TUserSession } from '@/schemas/users'
import Image from 'next/image'
import React from 'react'
import LogoIcon from '@/utils/images/logo-icon.png'
import Link from 'next/link'
import { MdLogout, MdSettings } from 'react-icons/md'
import { Settings } from 'lucide-react'
type HeaderProps = {
  session: TUserSession
}
function Header({ session }: HeaderProps) {
  return (
    <div className="border-b border-gray-300 shadow-sm rounded-bl rounded-br w-full flex items-center justify-between gap-2 p-3">
      <div className="p-2 flex items-center justify-center rounded-full bg-white">
        <div className="min-w-[25px] w-[25px] min-h-[25px] h-[25px] relative">
          <Image src={LogoIcon} alt="Logo Ampère+" fill={true} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm font-bold">{session.nome}</div>
        {session.visualizacao == 'GERAL' ? (
          <Link href={'/admin/configuracoes'}>
            <button className="text-sm hover:bg-gray-200 ease-in-out duration-300 rounded-full p-2">
              <MdSettings />
            </button>
          </Link>
        ) : null}

        <Link href={'/api/auth/logout'}>
          <button className="text-sm hover:bg-gray-200 ease-in-out duration-300 rounded-full p-2">
            <MdLogout />
          </button>
        </Link>
      </div>
    </div>
  )
}

export default Header
