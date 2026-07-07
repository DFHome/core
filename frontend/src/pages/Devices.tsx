import { Link } from "react-router-dom";

import { Package } from "lucide-react";



import { groupDevicesForDisplay } from "@/lib/device-utils";

import { hasDeviceIntegration } from "@/lib/integration-utils";

import { DeviceCard } from "@/components/DeviceCard";

import { DeviceScanPanel } from "@/components/devices/DeviceScanPanel";

import { useDevices } from "@/hooks/use-devices";

import { useDeviceScan } from "@/hooks/use-device-scan";

import { useIntegrations } from "@/hooks/use-integrations";

import { useRooms } from "@/hooks/use-rooms";

import { Badge } from "@/components/ui/badge";

import { buttonVariants } from "@/components/ui/button";



export default function Devices() {

  const { devices, isLoading: devicesLoading } = useDevices();

  const { rooms, isLoading: roomsLoading } = useRooms();

  const { integrations, isLoading: integrationsLoading } = useIntegrations();

  const {

    open,

    phase,

    scanning,

    countdownLabel,

    devices: discoveredDevices,

    blips,

    startScan,

    cancelScan,

  } = useDeviceScan();



  const deviceIntegrationInstalled = hasDeviceIntegration(integrations);

  const grouped = groupDevicesForDisplay(rooms, devices);



  if (devicesLoading || roomsLoading || integrationsLoading) {

    return <p className="text-muted-foreground text-sm">Загрузка устройств…</p>;

  }



  return (

    <div className="w-full space-y-6">

      <DeviceScanPanel

        blips={blips}

        devices={discoveredDevices}

        open={open}

        phase={phase}

        scanning={scanning}

        countdownLabel={countdownLabel}

        onStartScan={startScan}

        onCancelScan={cancelScan}

      />



      <p className="w-full text-sm text-muted-foreground">

        Карточный список комнат и устройств. Управление и показания датчиков —

        прямо из карточек.

      </p>



      <div className="w-full space-y-8">

        {!deviceIntegrationInstalled && grouped.length === 0 ? (

          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12 text-center">

            <Package className="text-muted-foreground size-10" />

            <div className="space-y-1">

              <p className="font-medium">Устройств пока нет</p>

              <p className="text-muted-foreground max-w-md text-sm">

                Установите интеграцию в магазине или запустите сканирование выше.
              </p>

            </div>

            <Link to="/store" className={buttonVariants({ variant: "outline" })}>

              Открыть магазин

            </Link>

          </div>

        ) : grouped.length === 0 ? (

          <p className="text-muted-foreground text-sm">

            Устройств пока нет. Запустите сканирование или добавьте устройства

            через интеграцию.

          </p>

        ) : (

          grouped.map(({ room, devices: roomDevices }) => (

            <section key={room.id} className="w-full space-y-3">

              <div className="flex items-center gap-2">

                <h2 className="font-heading text-lg font-semibold">{room.name}</h2>

                <Badge variant="secondary" className="font-normal">

                  {roomDevices.length}

                </Badge>

              </div>

              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

                {roomDevices.map((device) => (

                  <DeviceCard key={device.id} device={device} />

                ))}

              </div>

            </section>

          ))

        )}

      </div>

    </div>

  );

}

