import{br as v,e1 as A,r as h,bk as I,bE as F,j as e,b4 as P,aT as T,aU as B,aV as R,T as l,aW as V,b1 as M,B as C,bm as $,cf as O,u as U,bl as Y,e2 as _,t as b}from"./index-Bl-RK3XD.js";import{D as G}from"./data-table-bulk-action-item-_FylRKru.js";import{C as H}from"./configurable-operation-input-Bz5jJjuv.js";const K=v(`
    mutation DuplicateEntity($input: DuplicateEntityInput!) {
        duplicateEntity(input: $input) {
            ... on DuplicateEntitySuccess {
                newEntityId
            }
            ... on ErrorResult {
                errorCode
                message
            }
            ... on DuplicateEntityError {
                duplicationError
            }
        }
    }
`),N=v(`
        query GetEntityDuplicators {
            entityDuplicators {
                code
                description
                requiresPermission
                forEntities
                args {
                    ...ConfigArgDefinition
                }
            }
        }
    `,[A]);function Q({open:m,onOpenChange:d,entityType:y,entityName:a,duplicatorCode:g,onConfirm:r}){const[n,c]=h.useState(),{data:E}=I({queryKey:["entityDuplicators"],queryFn:()=>$.query(N),staleTime:1e3*60*60*5}),s=E?.entityDuplicators?.find(i=>i.code===g&&i.forEntities.includes(y));F.useEffect(()=>{s&&!n&&c({code:s.code,arguments:s.args?.map(i=>({name:i.name,value:i.defaultValue!=null?i.defaultValue.toString():""}))||[]})},[s,n]);const D=i=>{c(i)},x=()=>{n&&(r(n),d(!1),c(void 0))},p=()=>{d(!1),c(void 0)};return e.jsx(P,{open:m,onOpenChange:d,children:e.jsxs(T,{className:"sm:max-w-lg",children:[e.jsxs(B,{children:[e.jsx(R,{children:e.jsx(l,{id:"Lns7sP",values:{0:a.toLowerCase()}})}),e.jsx(V,{className:"sr-only",children:e.jsx(l,{id:"bX+LyM",values:{0:a.toLowerCase()}})})]}),e.jsxs("div",{className:"space-y-4",children:[n&&s&&e.jsx(H,{operationDefinition:s,value:n,onChange:D,removable:!1}),!s&&e.jsx("div",{className:"text-sm text-muted-foreground",children:e.jsx(l,{id:"B6LoY7",values:{duplicatorCode:g,entityName:a}})})]}),e.jsxs(M,{children:[e.jsx(C,{variant:"outline",onClick:p,children:e.jsx(l,{id:"dEgA5A"})}),e.jsx(C,{onClick:x,disabled:!n,children:e.jsx(l,{id:"euc6Ns"})})]})]})})}function J({entityType:m,duplicatorCode:d,requiredPermissions:y,entityName:a,onSuccess:g,selection:r,table:n}){const{refetchPaginatedList:c}=O(),{_:E}=U(),[s,D]=h.useState(!1),[x,p]=h.useState({completed:0,total:0}),[i,j]=h.useState(!1),{mutateAsync:w}=Y({mutationFn:$.mutate(K)}),L=()=>{s||j(!0)},k=async S=>{if(s)return;D(!0),p({completed:0,total:r.length});const t={success:0,failed:0,errors:[]};try{for(let o=0;o<r.length;o++){const f=r[o];try{const u=await w({input:{entityName:m,entityId:f.id,duplicatorInput:S}});if("newEntityId"in u.duplicateEntity)t.success++;else{t.failed++;const q=u.duplicateEntity.message||u.duplicateEntity.duplicationError||"Unknown error";t.errors.push(`${a} ${f.name||f.id}: ${q}`)}}catch(u){t.failed++,t.errors.push(`${a} ${f.name||f.id}: ${u instanceof Error?u.message:"Unknown error"}`)}p({completed:o+1,total:r.length})}if(t.success>0){const o=t.success;b.success(E({id:"YRTdLc",values:{count:o,entityName:a}}))}if(t.failed>0){const o=t.errors.length>3?`${t.errors.slice(0,3).join(", ")}... and ${t.errors.length-3} more`:t.errors.join(", ");b.error(`Failed to duplicate ${t.failed} ${a.toLowerCase()}s: ${o}`)}t.success>0&&(c(),n.resetRowSelection(),g?.())}finally{D(!1),p({completed:0,total:0})}};return e.jsxs(e.Fragment,{children:[e.jsx(G,{requiresPermission:y,onClick:L,label:s?e.jsx(l,{id:"+lpe0V",values:{0:x.completed,1:x.total}}):e.jsx(l,{id:"euc6Ns"}),icon:_,closeOnClick:!1}),e.jsx(Q,{open:i,onOpenChange:j,entityType:m,entityName:a,entities:r,duplicatorCode:d,onConfirm:k})]})}export{J as D};
