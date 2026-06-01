import{r as a,u as h,bj as j,bl as y,t as o,fo as A,bm as N,fp as L,j as s,es as P,B as T,aM as $,fn as M,T as D,br as F}from"./index-Bl-RK3XD.js";import{C as G}from"./customer-selector-DrnC-nF6.js";const n=F(`
    query CustomerGroupMemberList($id: ID!, $options: CustomerListOptions) {
        customerGroup(id: $id) {
            customers(options: $options) {
                items {
                    id
                    createdAt
                    updatedAt
                    firstName
                    lastName
                    emailAddress
                }
                totalItems
            }
        }
    }
`);function v({customerGroupId:r,canAddCustomers:u=!0}){const[l,d]=a.useState([]),[m,c]=a.useState(1),[p,g]=a.useState(10),[f,C]=a.useState([]),{_:i}=h(),b=j(),{mutate:S}=y({mutationFn:N.mutate(L),onSuccess:()=>{o.success(i({id:"y3tQ/s"})),b.invalidateQueries({queryKey:[A,n]})},onError:()=>{o.error(i({id:"ZlA28n"}))}});return s.jsxs("div",{children:[s.jsx(P,{listQuery:M(n),transformVariables:e=>({...e,id:r}),page:m,itemsPerPage:p,sorting:l,columnFilters:f,onPageChange:(e,t,x)=>{c(t),g(x)},onSortChange:(e,t)=>{d(t)},onFilterChange:(e,t)=>{C(t)},onSearchTermChange:e=>({lastName:{contains:e},emailAddress:{contains:e}}),additionalColumns:{name:{header:"Name",cell:({row:e})=>{const t=`${e.original.firstName} ${e.original.lastName}`;return s.jsx(T,{render:s.jsx($,{to:"/customers/$id",params:{id:e.original.id}}),variant:"ghost",children:t})}}},defaultColumnOrder:["name","emailAddress"],defaultVisibility:{id:!1,createdAt:!1,updatedAt:!1,firstName:!1,lastName:!1}}),u&&s.jsx(G,{onSelect:e=>{S({customerId:e.id,groupId:r})},label:s.jsx(D,{id:"IswRMs"})})]})}export{v as C};
