import { Info } from 'lucide-react';
import { PageHeader } from '../components/admin/AdminLayout.jsx';
import { DeviceTable } from '../components/admin/DeviceTable.jsx';
import { Card } from '../components/shared/ui.jsx';

export default function DevicesPage() {
  return (
    <>
      <PageHeader title="Estaciones de votación" description="Máximo 10 estaciones activas. Ninguna acción aquí borra votos." />
      <Card className="p-5">
        <DeviceTable />
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <Info className="size-5 text-navy-700" /> Cómo usar las estaciones
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>
            <strong>Registrar:</strong> abra el enlace de votación (sin <code>?view=admin</code>) en la tablet y escriba un nombre
            (“Mesa 1”).
          </li>
          <li>
            <strong>Habilitar para cada votante:</strong> en la pantalla de espera toque <strong>3 veces seguidas la esquina
            superior izquierda</strong>. También puede usar <em>Habilitar</em> en esta tabla.
          </li>
          <li>
            <strong>Después de votar</strong> la estación se bloquea sola y muestra “¡Su voto fue registrado!”. Recargar la página no
            la desbloquea.
          </li>
          <li>
            <strong>Reiniciar</strong> descarta una papeleta a medio llenar (por ejemplo, si alguien se fue sin terminar). Nunca toca
            los votos registrados.
          </li>
          <li>
            Si una tablet pierde su registro (p. ej. se borró el navegador), deshabilite la estación vieja aquí y regístrela de
            nuevo.
          </li>
        </ol>
      </Card>
    </>
  );
}
