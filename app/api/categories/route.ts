import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
export async function PATCH(req:Request){if(!await currentUserId())return NextResponse.json({error:'Tidak diizinkan'},{status:401});const {id,selected,prefixFilterEnabled,excludedPrefixes}=await req.json();if(!id)return NextResponse.json({error:'Kategori tidak ditemukan'},{status:400});const data:any={};if(typeof selected==='boolean')data.selected=selected;if(typeof prefixFilterEnabled==='boolean')data.prefixFilterEnabled=prefixFilterEnabled;if(typeof excludedPrefixes==='string')data.excludedPrefixes=excludedPrefixes;await prisma.productCategory.update({where:{id},data});return NextResponse.json({message:'Kategori diperbarui'})}
