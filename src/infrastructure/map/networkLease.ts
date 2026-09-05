/** A live page must confirm every tile request, including after worker restart. */
let enabled = false;
let listening = false;
export async function setMapNetworkLease(next: boolean): Promise<boolean> {
  enabled = next;
  const service = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  if (!service?.controller) {
    enabled = false;
    return false;
  }
  if (!listening) {
    service.addEventListener('message', (event) => {
      if (event.data?.type === 'PHOTO_MARKER_MAP_QUERY') event.ports[0]?.postMessage({ enabled });
    });
    listening = true;
  }
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (ack: boolean) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(ack);
    };
    const timer = setTimeout(() => finish(false), 3000);
    channel.port1.onmessage = (event) => finish(event.data?.acknowledged === true);
    try {
      service.controller!.postMessage({ type: 'PHOTO_MARKER_MAP_NETWORK', enabled }, [
        channel.port2,
      ]);
    } catch {
      finish(false);
    }
  });
}
