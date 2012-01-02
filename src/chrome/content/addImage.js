var trails_addimage = {

pageNumber: "",
pageLayout: "",

Init: function() {

	try {
	
	    var mDBConn = trails.openDB();
	    var getStatement = mDBConn.createStatement('SELECT currentImage, currentPage, currentText FROM Settings');
	
	    var currentImage, currentPage, currentImageURL;
	
	    while (getStatement.executeStep()) {
	        currentImage = getStatement.getUTF8String(0);
	        currentPage = getStatement.getInt32(1);
	        currentImageURL = getStatement.getUTF8String(2);
	    }
	}
	catch (e) {
	    alert("SQL error (Init): " + e);
	}
	
	var image = document.getElementById("image");
	image.src = currentImageURL;

	//Fills the pagesList menupopup with available pages.
	var pagesList = document.getElementById("pagesList");
	var totalPages = trails.fetchPageCount();
	for(var i = 1; i <= totalPages; i++) {
	pagesList.appendItem(i);
	}	
	
	var cSelected = currentPage;
	if(cSelected == '') {cSelected = 1; }
	if(cSelected > totalPages) { cSelected = 1;}
	pagesList.selectedIndex = cSelected - 1;
},

saveImageDialog: function() {

	try {
	
	    var mDBConn = trails.openDB();
	    var getStatement = mDBConn.createStatement('SELECT currentImage, currentText FROM Settings');
	
	    var currentImage, currentImageURL;
	
	    while (getStatement.executeStep()) {
	        currentImage = getStatement.getUTF8String(0);
	        currentImageURL = getStatement.getUTF8String(1);
	    }
	}
	catch (e) {
	    alert("SQL error (Init): " + e);
	}

	var image = document.getElementById("image");

	var dummyArticle = "" +
		'<li>' +
			'<div class="reference">SOURCE<br/>TIME</div>' +
			'<image class="artImg" src="' + currentImageURL + '" width="74" />' +
		'</li>';
	
	//Get and write the pagenumber.
	var pList = document.getElementById('pagesList');
	this.pageNumber = pList.selectedIndex + 1;
	var page = 	window.opener.document.getElementById('sidebar').contentWindow.document.getElementById('browserTable').contentWindow.document.getElementById("page" + this.pageNumber).getElementsByTagName('DIV')[0];
	
	var spread = page.getElementsByTagName('DIV')[0].getElementsByTagName("ul")[0];
	spread.innerHTML += dummyArticle;
	
	//Get the amt of columns
	try {
	    var mDBConn = trails.openDB();
	    var getStatement = mDBConn.createStatement("SELECT columns FROM Pages WHERE pageID = '"+ this.pageNumber +"'");
	
	    while (getStatement.executeStep()) {
	        this.pageLayout = getStatement.getInt32(0);
		}
	} catch (e) {
	    alert("SQL error (get columns for dummy): " + e);
	}
	
	this.getImgHeight();
},

checkAndStoreIfValid: function(page) {

	if(trails.getHorizontalOverflow(page)<1) {
		window.opener.document.getElementById('sidebar').contentWindow.location.reload();
		var answer = confirm("Article doesn't fit.\nA new page will be inserted, and the article will be added to it.\n\nIf you'd rather insert the article on another page, cancel this dialogue and choose another insert page.");
		if(answer) {
			trails.addPageAfter(this.pageNumber,this.pageLayout);
			this.pageNumber = this.pageNumber +1;
		} else {
			return false;
		}
	}

	try {
	
		var mDBConn = trails.openDB();
		mDBConn.executeSimpleSQL("UPDATE Settings SET currentPage = '" + (this.pageNumber) + "'");
	
	}
	catch (e) {
		alert("SQL error (saveImageDialog): " + e);
	}
		
	var currentArticle = trails.fetchArticleCount(this.pageNumber) + 1;
	var reference = document.getElementById("reference");
	var separator = document.getElementById("separator");
	
	//Fetching the URL and the filename, as these functions can not be used from this window:
	
	try {
	
		var mDBConn = trails.openDB();
		var getStatement = mDBConn.createStatement('SELECT currentImage, currentPage FROM Settings');
	
		var currentImage, currentPage, currentImageURL;
	
		while (getStatement.executeStep()) {
			currentImage = getStatement.getUTF8String(0);
			currentPage = getStatement.getInt32(1);
		}
	
		var theImage = Components.classes["@mozilla.org/file/local;1"]
						 .createInstance(Components.interfaces.nsILocalFile);
		theImage.initWithPath(trails.ext().path);
		theImage.append('chrome'); theImage.append('content');
		theImage.append('booklet'); theImage.append(currentImage);	
        
		if(theImage.exists()) {
            var aId = trails.storeArticle(currentImage, currentArticle, this.pageNumber, 'image', reference.selected, this.pageLayout);
            this.saveImageToDB(theImage, currentImage, aId, this.pageNumber);
		} else {
			alert("The image could not be saved. Try viewing the image directly by right clicking it and choose 'View Image' and try again.");
		}
		
		window.close();
		trails.updatePreview('browser');
	
	} catch (e) {
		alert("Error (saveImageDialog2): " + e);
	}
},

getImgHeight: function() {

	var heightTimer;
	
	var page = window.opener.document.getElementById('sidebar').contentWindow.document.getElementById('browserTable').contentWindow.document.getElementById("page" + this.pageNumber).getElementsByTagName('DIV')[0];
	var spread = page.getElementsByTagName('DIV')[0].getElementsByTagName("ul")[0];

	if(spread.getElementsByTagName("img").length > 0) {
		var imgs = spread.getElementsByTagName("img");
					
		//alert(imgs[imgs.length-1].height);
		if(imgs[imgs.length-1].height > 0) {
			//alert("yay!" + imgs[imgs.length-1].height);
			this.checkAndStoreIfValid(page);
		} else {
			//alert("nay! " + imgs[imgs.length-1].height);
			heightTimer = setTimeout("trails_addimage.getImgHeight();", 100);
		}
	} else {
		this.checkAndStoreIfValid(page);
	}
},

saveImageToDB: function(file, name, aId, pId) {

	var ios = Components.classes["@mozilla.org/network/io-service;1"].
	                    getService(Components.interfaces.nsIIOService);
	var url = ios.newFileURI(file, null, null);
	
	if (!url || !url.schemeIs("file")) throw "Expected a file URL.";
	
	var iFile = url.QueryInterface(Components.interfaces.nsIFileURL).file;
	
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].
	                        createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(iFile, -1, -1, false);
	
	var bstream = Components.classes["@mozilla.org/binaryinputstream;1"].
	                        createInstance(Components.interfaces.nsIBinaryInputStream);
	bstream.setInputStream(istream);
	
	var bytes = bstream.readByteArray(bstream.available());
	
    var mDBConn = trails.openDB();
    var st = mDBConn.createStatement("INSERT INTO Images (name, data, aId, pId) VALUES (?1, ?2, ?3, ?4)");
    st.bindUTF8StringParameter(0, name);
    st.bindBlobParameter(1, bytes, bytes.length);
    st.bindInt32Parameter(2, aId);
    st.bindInt32Parameter(3, pId);
    st.execute();
},

cancelImage: function() {

//Removes the image from the desktop in case it's not gonna be added.

	try {
	
	    var mDBConn = trails.openDB();
	    var getStatement = mDBConn.createStatement('SELECT currentImage FROM Settings');
	
	    var currentImage, currentLastDirForImage;
	
	    while (getStatement.executeStep()) {
	        currentImage = getStatement.getUTF8String(0);
	    }
	
		var imageName = currentImage;
		
		var theImage = Components.classes["@mozilla.org/file/local;1"]
		.createInstance(Components.interfaces.nsILocalFile);
		theImage.initWithPath(trails.temp.path);
		theImage.append(imageName);
		
        if(theImage.exists()) {
            theImage.remove(true);
        }
	
	    window.close();
	    
	} catch (e) {
	    alert("Error (cancelImage): " + e);
	}
}


};