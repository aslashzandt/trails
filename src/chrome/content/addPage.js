function writeNewPageAfter(columns) {

	try {
	    var mDBConn = openDB();
	    mDBConn.executeSimpleSQL("UPDATE Settings SET currentColumns = '" + columns + "'");
	
	}
	catch (e) {
	    alert("SQL error (writeNewPageAfter): " + e);
	}

}