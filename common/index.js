/**
 * 
 * @param {*} res 
 * @param {*} status 
 * @param {*} success 
 * @param {*} message 
 * @param {*} data 
 * @returns 
 */
export const sendResponse = (res, status, success, message, data = []) => {
    return res.status(status).json({ status,success, message, data });
};
  
/**
 * 
 * @param {*} num 
 * @returns 
 */
export const roundToTwo = (num) => {
  return Math.round(num * 100) / 100;
}