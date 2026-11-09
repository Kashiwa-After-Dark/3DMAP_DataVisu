// Same GLB calibration as the route-history map, without its UI dependencies.
const ORIGIN = { lat: 35.86183529140233, lon: 139.97190479462844 };
export function projectLocation({ lat, lon }) {
  return {
    x: (lon - ORIGIN.lon) * 111320 * Math.cos(ORIGIN.lat * Math.PI / 180) / 1.0004200803610934,
    z: (lat - ORIGIN.lat) * 111320 / -0.9955676144207827,
  };
}
