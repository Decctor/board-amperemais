import React, { PropsWithChildren, useState } from 'react'

function FullScreenWrapper({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-[100vh] w-screen max-w-full flex-col  bg-[#fff] font-Inter xl:min-h-[100vh]">
      <div className="flex min-h-[100%] grow">
        <div className="flex w-full grow flex-col">{children}</div>
      </div>
    </div>
  )
}

export default FullScreenWrapper
