export const getDistanceInKm = (storeLat,storeLon,custLat,custLon)=>{
    const R = 6371; // Radius of Earth in KM

    const dLat = (custLat - storeLat) * Math.PI/180;
    const dLon = (custLon - storeLon) * Math.PI/180;

    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) + 
        Math.cos(storeLat * Math.PI / 180) *
          Math.cos(custLat * Math.PI / 180) *
          Math.sin(dLon/2) *
          Math.sin(dLon/2);
          
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}