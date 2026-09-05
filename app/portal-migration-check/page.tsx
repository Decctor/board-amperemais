"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";

function Controls() {
 const [value,setValue]=useState<string|null>("a");
 const [result,setResult]=useState("Nenhuma ação");
 const [checked,setChecked]=useState(false);
 return <div className="flex flex-wrap items-center gap-4 p-6">
  <Popover><PopoverTrigger render={<Button>Testar popover</Button>}/><PopoverContent><label>Pesquisa<input aria-label="Pesquisa" className="border" /></label><Button onClick={()=>setResult("Popover funciona")}>Ação do popover</Button></PopoverContent></Popover>
  <TooltipProvider delay={0}><Tooltip><TooltipTrigger render={<Button>Dica</Button>}/><TooltipContent>Texto da dica</TooltipContent></Tooltip></TooltipProvider>
  <HoverCard><HoverCardTrigger delay={0} render={<a href="#preview">Prévia</a>}/><HoverCardContent>Conteúdo da prévia</HoverCardContent></HoverCard>
  <DropdownMenu><DropdownMenuTrigger render={<Button>Testar menu</Button>}/><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Ações</DropdownMenuLabel><DropdownMenuItem onClick={()=>setResult("Menu funciona")}>Executar ação</DropdownMenuItem><DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>Marcar opção</DropdownMenuCheckboxItem><DropdownMenuSub><DropdownMenuSubTrigger>Mais opções</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuGroup><DropdownMenuItem onClick={()=>setResult("Submenu funciona")}>Ação secundária</DropdownMenuItem></DropdownMenuGroup></DropdownMenuSubContent></DropdownMenuSub></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
  <Select value={value} onValueChange={setValue} items={[{value:"a",label:"Primeira opção"},{value:"b",label:"Segunda opção"}]}><SelectTrigger aria-label="Escolha"><SelectValue/></SelectTrigger><SelectContent><SelectGroup><SelectItem value="a">Primeira opção</SelectItem><SelectItem value="b">Segunda opção</SelectItem></SelectGroup></SelectContent></Select>
  <output>{result}</output>
 </div>;
}
export default function PortalMigrationCheck(){return <main className="p-10"><h1>Validação de portais</h1><Controls/><Dialog><DialogTrigger render={<Button>Abrir diálogo</Button>}/><DialogContent><DialogTitle>Diálogo de teste</DialogTitle><Controls/></DialogContent></Dialog><Sheet><SheetTrigger render={<Button>Abrir painel</Button>}/><SheetContent><SheetTitle>Painel de teste</SheetTitle><Controls/></SheetContent></Sheet></main>;}
