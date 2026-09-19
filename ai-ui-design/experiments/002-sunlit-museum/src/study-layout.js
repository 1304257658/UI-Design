// The visual slice is deliberately one room. Gallery expansion is a separate milestone.
export const STUDY_EXHIBITS = [
  {id:'glass',x:0,z:0,width:3.45,depth:1.8,height:1.02,panelWidth:2.42,panelHeight:3.82},
  {id:'minimal',x:-4.3,z:-1.55,width:2.72,depth:1.5,height:.94,panelWidth:1.9,panelHeight:3.04},
  {id:'brutal',x:4.15,z:-1.5,width:2.72,depth:1.5,height:.94,panelWidth:1.9,panelHeight:3.04},
];
export const ENTRY = {x:.45,y:2.12,z:10.2,yaw:.018,pitch:-.065};
export const POND = {x:-9,z:8,radius:5.1};
export function canWalkStudy(x,z,radius=.3){
  // Circular gallery; broad limits account for the curved wall and columns.
  if(Math.hypot(x,z)>11.2-radius)return false;
  if(Math.hypot(x-POND.x,z-POND.z)<POND.radius+radius)return false;
  if(Math.abs(x-9.3)<1.05+radius&&Math.abs(z-2)<2.8+radius)return false;
  return !STUDY_EXHIBITS.some(e=>Math.abs(x-e.x)<e.width/2+radius&&Math.abs(z-e.z)<e.depth/2+radius);
}
