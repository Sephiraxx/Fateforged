// sin, cos and atan2 that give the same result in every JavaScript engine (and in the Rust core).
// Math.sin/Math.cos differ between V8 builds: node uses fdlibm, while Chrome, Edge (WebView2) and Android WebView use a
// glibc copy, and about 2% of results differ by one unit in the last place. That is enough to change a seeded game.
// Math.atan2 is the same fdlibm everywhere today, but it is compiled C++ inside the browser, so it is included too.
// This is V8's fdlibm (src/base/ieee754.cc) in plain JavaScript, so engines from team-2.9 / team-4.0 on play the same
// game everywhere; core/src/jsmath/fdlibm.rs is the same code in Rust.
//
// fdlibm: Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved. Developed at SunSoft, a Sun Microsystems,
// Inc. business. Permission to use, copy, modify, and distribute this software is freely granted, provided that this
// notice is preserved.
const F64=new Float64Array(1),U32=new Uint32Array(F64.buffer),LE=new Uint8Array(new Uint16Array([1]).buffer)[0]===1,H=LE?1:0,L=LE?0:1;
const hi=x=>{F64[0]=x;return U32[H]|0;},lo=x=>{F64[0]=x;return U32[L]>>>0;};
const words=(h,l)=>{U32[H]=h>>>0;U32[L]=l>>>0;return F64[0];};
const TWO_OVER_PI=[0xA2F983,0x6E4E44,0x1529FC,0x2757D1,0xF534DD,0xC0DB62,0x95993C,0x439041,0xFE5163,0xABDEBB,0xC561B7,0x246E3A,0x424DD2,0xE00649,0x2EEA09,0xD1921C,0xFE1DEB,0x1CB129,0xA73EE8,0x8235F5,0x2EBB44,0x84E99C,0x7026B4,0x5F7E41,0x3991D6,0x398353,0x39F49C,0x845F8B,0xBDF928,0x3B1FF8,0x97FFDE,0x05980F,0xEF2F11,0x8B5A0A,0x6D1F6D,0x367ECF,0x27CB09,0xB74F46,0x3F669E,0x5FEA2D,0x7527BA,0xC7EBE5,0xF17B3D,0x0739F7,0x8A5292,0xEA6BFB,0x5FB11F,0x8D5D08,0x560330,0x46FC7B,0x6BABF0,0xCFBC20,0x9AF436,0x1DA9E3,0x91615E,0xE61B08,0x659985,0x5F14A0,0x68408D,0xFFD880,0x4D7327,0x310606,0x1556CA,0x73A8C9,0x60E27B,0xC08C6B];
const NPIO2_HW=[0x3FF921FB,0x400921FB,0x4012D97C,0x401921FB,0x401F6A7A,0x4022D97C,0x4025FDBB,0x402921FB,0x402C463A,0x402F6A7A,0x4031475C,0x4032D97C,0x40346B9C,0x4035FDBB,0x40378FDB,0x403921FB,0x403AB41B,0x403C463A,0x403DD85A,0x403F6A7A,0x40407E4C,0x4041475C,0x4042106C,0x4042D97C,0x4043A28C,0x40446B9C,0x404534AC,0x4045FDBB,0x4046C6CB,0x40478FDB,0x404858EB,0x404921FB];
const PIO2=[1.57079625129699707031e+00,7.54978941586159635335e-08,5.39030252995776476554e-15,3.28200341580791294123e-22,1.27065575308067607349e-29,1.22933308981111328932e-36,2.73370053816464559624e-44,2.16741683877804819444e-51];
const TWO24=1.67772160000000000000e+07,TWON24=5.96046447753906250000e-08;
// C's (int32_t) cast of a double that fits: truncation.
const toInt=x=>x<0?Math.ceil(x)|0:Math.floor(x)|0;
function scalbn(x,n){
 const x1p1023=words(0x7fe00000,0),x1p53=words(0x43400000,0),x1p_1022=words(0x00100000,0);let y=x;
 if(n>1023){y*=x1p1023;n-=1023;if(n>1023){y*=x1p1023;n-=1023;if(n>1023)n=1023;}}
 else if(n<-1022){y*=x1p_1022*x1p53;n+=1022-53;if(n<-1022){y*=x1p_1022*x1p53;n+=1022-53;if(n<-1022)n=-1022;}}
 return y*words((0x3ff+n)<<20,0);
}
function kernelRemPio2(x,y,e0,nx){
 const jk=4,jp=jk,jx=nx-1,iq=new Int32Array(20),f=new Float64Array(20),fq=new Float64Array(20),q=new Float64Array(20);
 let jv=toInt((e0-3)/24);if(jv<0)jv=0;let q0=e0-24*(jv+1),j=jv-jx;const m=jx+jk;
 for(let i=0;i<=m;i++,j++)f[i]=j<0?0:TWO_OVER_PI[j];
 for(let i=0;i<=jk;i++){let fw=0;for(let j=0;j<=jx;j++)fw+=x[j]*f[jx+i-j];q[i]=fw;}
 let jz=jk,z,n,ih;
 for(;;){
  z=q[jz];for(let i=0,j=jz;j>0;i++,j--){const fw=toInt(TWON24*z);iq[i]=toInt(z-TWO24*fw);z=q[j-1]+fw;}
  z=scalbn(z,q0);z-=8*Math.floor(z*0.125);n=toInt(z);z-=n;ih=0;
  if(q0>0){const i=iq[jz-1]>>(24-q0);n+=i;iq[jz-1]-=i<<(24-q0);ih=iq[jz-1]>>(23-q0);}
  else if(q0===0)ih=iq[jz-1]>>23;else if(z>=0.5)ih=2;
  if(ih>0){n+=1;let carry=0;for(let i=0;i<jz;i++){const j=iq[i];if(carry===0){if(j!==0){carry=1;iq[i]=0x1000000-j;}}else iq[i]=0xFFFFFF-j;}
   if(q0===1)iq[jz-1]&=0x7FFFFF;else if(q0===2)iq[jz-1]&=0x3FFFFF;
   if(ih===2){z=1-z;if(carry!==0)z-=scalbn(1,q0);}}
  if(z===0){let j=0;for(let i=jz-1;i>=jk;i--)j|=iq[i];
   if(j===0){let k=1;while(jk>=k&&iq[jk-k]===0)k++;for(let i=jz+1;i<=jz+k;i++){f[jx+i]=TWO_OVER_PI[jv+i];let fw=0;for(let j=0;j<=jx;j++)fw+=x[j]*f[jx+i-j];q[i]=fw;}jz+=k;continue;}}
  break;
 }
 if(z===0){jz-=1;q0-=24;while(iq[jz]===0){jz--;q0-=24;}}
 else{z=scalbn(z,-q0);if(z>=TWO24){const fw=toInt(TWON24*z);iq[jz]=toInt(z-TWO24*fw);jz+=1;q0+=24;iq[jz]=fw;}else iq[jz]=toInt(z);}
 let fw=scalbn(1,q0);for(let i=jz;i>=0;i--){q[i]=fw*iq[i];fw*=TWON24;}
 for(let i=jz;i>=0;i--){let fw=0;for(let k=0;k<=jp&&k<=jz-i;k++)fw+=PIO2[k]*q[i+k];fq[jz-i]=fw;}
 fw=0;for(let i=jz;i>=0;i--)fw+=fq[i];y[0]=ih===0?fw:-fw;
 fw=fq[0]-fw;for(let i=1;i<=jz;i++)fw+=fq[i];y[1]=ih===0?fw:-fw;
 return n&7;
}
const Y=new Float64Array(2),TX=new Float64Array(3);
function remPio2(x){
 const hx=hi(x),ix=hx&0x7FFFFFFF;
 if(ix<=0x3FE921FB){Y[0]=x;Y[1]=0;return 0;}
 if(ix<0x4002D97C){
  if(hx>0){let z=x-1.57079632673412561417e+00;if(ix!==0x3FF921FB){Y[0]=z-6.07710050650619224932e-11;Y[1]=(z-Y[0])-6.07710050650619224932e-11;}else{z-=6.07710050630396597660e-11;Y[0]=z-2.02226624879595063154e-21;Y[1]=(z-Y[0])-2.02226624879595063154e-21;}return 1;}
  let z=x+1.57079632673412561417e+00;if(ix!==0x3FF921FB){Y[0]=z+6.07710050650619224932e-11;Y[1]=(z-Y[0])+6.07710050650619224932e-11;}else{z+=6.07710050630396597660e-11;Y[0]=z+2.02226624879595063154e-21;Y[1]=(z-Y[0])+2.02226624879595063154e-21;}return -1;
 }
 if(ix<=0x413921FB){
  let t=Math.abs(x);const n=toInt(t*6.36619772367581382433e-01+0.5),fn=n;let r=t-fn*1.57079632673412561417e+00,w=fn*6.07710050650619224932e-11;
  if(n<32&&ix!==NPIO2_HW[n-1])Y[0]=r-w;
  else{const j=ix>>20;Y[0]=r-w;let i=j-((hi(Y[0])>>>20)&0x7FF);
   if(i>16){t=r;w=fn*6.07710050630396597660e-11;r=t-w;w=fn*2.02226624879595063154e-21-((t-r)-w);Y[0]=r-w;i=j-((hi(Y[0])>>>20)&0x7FF);
    if(i>49){t=r;w=fn*2.02226624871116645580e-21;r=t-w;w=fn*8.47842766036889956997e-32-((t-r)-w);Y[0]=r-w;}}}
  Y[1]=(r-Y[0])-w;if(hx<0){Y[0]=-Y[0];Y[1]=-Y[1];return -n;}return n;
 }
 if(ix>=0x7FF00000){Y[0]=Y[1]=x-x;return 0;}
 const e0=(ix>>20)-1046;let z=words((ix-(e0<<20))>>>0,lo(x));
 for(let i=0;i<2;i++){TX[i]=toInt(z);z=(z-TX[i])*TWO24;}TX[2]=z;let nx=3;while(TX[nx-1]===0)nx--;
 const n=kernelRemPio2(TX,Y,e0,nx);if(hx<0){Y[0]=-Y[0];Y[1]=-Y[1];return -n;}return n;
}
function kernelCos(x,y){
 const ix=hi(x)&0x7FFFFFFF;if(ix<0x3E400000&&toInt(x)===0)return 1;
 const z=x*x,r=z*(4.16666666666666019037e-02+z*(-1.38888888888741095749e-03+z*(2.48015872894767294178e-05+z*(-2.75573143513906633035e-07+z*(2.08757232129817482790e-09+z*-1.13596475577881948265e-11)))));
 if(ix<0x3FD33333)return 1-(0.5*z-(z*r-x*y));
 const qx=ix>0x3FE90000?0.28125:words(ix-0x00200000,0),iz=0.5*z-qx,a=1-qx;return a-(iz-(z*r-x*y));
}
function kernelSin(x,y,iy){
 const ix=hi(x)&0x7FFFFFFF;if(ix<0x3E400000&&toInt(x)===0)return x;
 const z=x*x,v=z*x,r=8.33333333332248946124e-03+z*(-1.98412698298579493134e-04+z*(2.75573137070700676789e-06+z*(-2.50507602534068634195e-08+z*1.58969099521155010221e-10)));
 return iy===0?x+v*(-1.66666666666666324348e-01+z*r):x-((z*(0.5*y-v*r)-y)-v*-1.66666666666666324348e-01);
}
export function sin(x){
 const ix=hi(x)&0x7FFFFFFF;if(ix<=0x3FE921FB)return kernelSin(x,0,0);if(ix>=0x7FF00000)return x-x;
 switch(remPio2(x)&3){case 0:return kernelSin(Y[0],Y[1],1);case 1:return kernelCos(Y[0],Y[1]);case 2:return -kernelSin(Y[0],Y[1],1);default:return -kernelCos(Y[0],Y[1]);}
}
export function cos(x){
 const ix=hi(x)&0x7FFFFFFF;if(ix<=0x3FE921FB)return kernelCos(x,0);if(ix>=0x7FF00000)return x-x;
 switch(remPio2(x)&3){case 0:return kernelCos(Y[0],Y[1]);case 1:return -kernelSin(Y[0],Y[1],1);case 2:return -kernelCos(Y[0],Y[1]);default:return kernelSin(Y[0],Y[1],1);}
}
const ATANHI=[4.63647609000806093515e-01,7.85398163397448278999e-01,9.82793723247329054082e-01,1.57079632679489655800e+00];
const ATANLO=[2.26987774529616870924e-17,3.06161699786838301793e-17,1.39033110312309984516e-17,6.12323399573676603587e-17];
const AT=[3.33333333333329318027e-01,-1.99999999998764832476e-01,1.42857142725034663711e-01,-1.11111104054623557880e-01,9.09088713343650656196e-02,-7.69187620504482999495e-02,6.66107313738753120669e-02,-5.83357013379057348645e-02,4.97687799461593236017e-02,-3.65315727442169155270e-02,1.62858201153657823623e-02];
function atan(x){
 const hx=hi(x),ix=hx&0x7FFFFFFF;let id;
 if(ix>=0x44100000){if(ix>0x7FF00000||(ix===0x7FF00000&&lo(x)!==0))return x+x;return hx>0?ATANHI[3]+ATANLO[3]:-ATANHI[3]-ATANLO[3];}
 if(ix<0x3FDC0000){if(ix<0x3E400000&&1.0e300+x>1)return x;id=-1;}
 else{x=Math.abs(x);
  if(ix<0x3FF30000){if(ix<0x3FE60000){id=0;x=(2*x-1)/(2+x);}else{id=1;x=(x-1)/(x+1);}}
  else if(ix<0x40038000){id=2;x=(x-1.5)/(1+1.5*x);}else{id=3;x=-1/x;}}
 const z=x*x,w=z*z,s1=z*(AT[0]+w*(AT[2]+w*(AT[4]+w*(AT[6]+w*(AT[8]+w*AT[10]))))),s2=w*(AT[1]+w*(AT[3]+w*(AT[5]+w*(AT[7]+w*AT[9]))));
 if(id<0)return x-x*(s1+s2);
 const r=ATANHI[id]-((x*(s1+s2)-ATANLO[id])-x);return hx<0?-r:r;
}
export function atan2(y,x){
 const TINY=1.0e-300,PI_O_4=7.8539816339744827900E-01,PI_O_2=1.5707963267948965580E+00,PI=3.1415926535897931160E+00,PI_LO=1.2246467991473531772E-16;
 const hx=hi(x),lx=lo(x),ix=hx&0x7FFFFFFF,hy=hi(y),ly=lo(y),iy=hy&0x7FFFFFFF;
 const nanBits=(i,l)=>((i|((l|(-l>>>0))>>>31))>>>0)>0x7FF00000;
 if(nanBits(ix,lx)||nanBits(iy,ly))return x+y;
 if((((hx-0x3FF00000)|0)|lx)===0)return atan(y);
 let m=((hy>>31)&1)|((hx>>30)&2);
 if((iy|ly)===0){switch(m){case 0:case 1:return y;case 2:return PI+TINY;default:return -PI-TINY;}}
 if((ix|lx)===0)return hy<0?-PI_O_2-TINY:PI_O_2+TINY;
 if(ix===0x7FF00000){
  if(iy===0x7FF00000){switch(m){case 0:return PI_O_4+TINY;case 1:return -PI_O_4-TINY;case 2:return 3*PI_O_4+TINY;default:return -3*PI_O_4-TINY;}}
  switch(m){case 0:return 0;case 1:return -0;case 2:return PI+TINY;default:return -PI-TINY;}
 }
 if(iy===0x7FF00000)return hy<0?-PI_O_2-TINY:PI_O_2+TINY;
 const k=(iy-ix)>>20;let z;
 if(k>60){z=PI_O_2+0.5*PI_LO;m&=1;}else if(hx<0&&k<-60)z=0;else z=atan(Math.abs(y/x));
 switch(m){case 0:return z;case 1:return -z;case 2:return PI-(z-PI_LO);default:return (z-PI_LO)-PI;}
}
