import { Suspense } from "react";

import Cliente from "@/components/clientes/Datos";



export default function LaAradaPage() {

return (

<Suspense>

<Cliente />

</Suspense>

);

}