var globalVals = {
	API_base: (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER 
}

export default globalVals;