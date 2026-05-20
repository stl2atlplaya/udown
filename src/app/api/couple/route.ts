:13:45.613 
23:13:46.760 
  ▲ Next.js 14.2.5
23:13:46.761 
23:13:46.782 
   Creating an optimized production build ...
23:13:50.097 
Failed to compile.
23:13:50.098 
23:13:50.099 
./src/app/api/couple/route.ts
23:13:50.099 
Error: 
23:13:50.099 
  x Expected ',', got 's'
23:13:50.099 
    ,-[/vercel/path0/src/app/api/couple/route.ts:82:1]
23:13:50.100 
 82 | 
23:13:50.100 
 83 |     // Notify Person A that their partner joined
23:13:50.100 
 84 |     await sendPush(invite.created_by, {
23:13:50.100 
 85 |       title: '✦ It's a match!',
23:13:50.100 
    :                      ^
23:13:50.101 
 86 |       body: `${joinerName} just joined. I think you're gonna be good at this 😉`,
23:13:50.101 
 87 |       type: 'coupled',
23:13:50.101 
 88 |     })
23:13:50.101 
    `----
23:13:50.101 
23:13:50.101 
Caused by:
23:13:50.101 
    Syntax Error
23:13:50.102 
23:13:50.102 
Import trace for requested module:
23:13:50.102 
./src/app/api/couple/route.ts
23:13:50.102 
23:13:50.114 
23:13:50.115 
> Build failed because of webpack errors
23:13:50.154 
Error: Command "npm run build" exited with 1
