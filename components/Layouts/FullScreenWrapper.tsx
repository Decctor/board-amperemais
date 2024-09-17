import React, { PropsWithChildren, useState } from "react";
import { set } from "zod";
import Header from "../Header";
import { Sidebar } from "../Sidebar";
import { useSession } from "next-auth/react";
import LoadingPage from "../utils/LoadingPage";
function FullScreenWrapper({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-[100vh] w-screen max-w-full flex-col  bg-[#fff] font-Inter xl:min-h-[100vh]">
      <div className="flex min-h-[100%] grow">
        <div className="flex w-full grow flex-col">{children}</div>
      </div>
    </div>
  );
}

export default FullScreenWrapper;
