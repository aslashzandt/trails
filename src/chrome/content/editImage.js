var trails_editimage = {

image: "",
article: "",
page: "",


Init: function() {

	try {

		var mDBConn = trails.openDB();
		var getStatement = mDBConn.createStatement("SELECT currentImage, currentPage, currentArticle FROM Settings");

		

		while (getStatement.executeStep()) {
			this.image = getStatement.getUTF8String(0);
			this.page = getStatement.getInt32(1);
			this.article = getStatement.getInt32(2);
		}
	} catch (e) {
		alert("SQL error (Init): " + e);
	}	
	
	try {
	
	    var mDBConn = trails.openDB();
	    var getStatement = mDBConn.createStatement("SELECT URL, content, reftype FROM Articles WHERE pageID = '"+ this.page +"' AND articleID = '" + this.article + "'");
	
	    var imageName, imageURL, reftype;
	
	    while (getStatement.executeStep()) {
	        imageURL = getStatement.getUTF8String(0);
	        imageName = getStatement.getUTF8String(1);
	        reftype = getStatement.getUTF8String(2);
	    }
	} catch (e) {
	    alert("SQL error (Init2): " + e);
	}
	
	
	var imageField = document.getElementById("image");
	
	if (trails.fetchOS() == 'win') {
		var imageLocalLoc = (trails.ext().path + '\\chrome\\content\\booklet\\' + imageName );
		} else { imageLocalLoc = (trails.ext().path + '/chrome/content/booklet/' + imageName ); }
	
		var imgFinalURL = 'file:///' + imageLocalLoc;
		
	imageField.src = imgFinalURL;
	
	var separator = document.getElementById("separator");
	var reference = document.getElementById("reference");
	
	var editRadio = document.getElementById("editRadio");
	if (reftype == 'true') { editRadio.selectedIndex = 0; } else {editRadio.selectedIndex = 1; }

},


editImageDialog: function() {

/*	try {
	
	    var mDBConn = openDB();
	    var getStatement = mDBConn.createStatement("SELECT currentImage, currentPage, currentArticle FROM Settings");
	
	    var image, article, page;
	
	    while (getStatement.executeStep()) {
	        image = getStatement.getUTF8String(0);
	        page = getStatement.getInt32(1);
	        article = getStatement.getInt32(2);
	    }
	} catch (e) {
	    alert("SQL error (editImageDialog): " + e);
	}
*/	
	
	var reference = document.getElementById("reference");
	var separator = document.getElementById("separator");
	
	
	try {
	
	    var mDBConn = trails.openDB();
	    var getStatement = mDBConn.createStatement("SELECT URL, content, reftype FROM Articles WHERE pageID = '" + this.page + "' AND articleID = '" + this.article + "'");
	
	    var imageName, imageURL, reftype;
	
	    while (getStatement.executeStep()) {
	        imageURL = getStatement.getUTF8String(0);
	        imageName = getStatement.getUTF8String(1);
	        reftype = getStatement.getUTF8String(2);
	    }
	} catch (e) {
	    alert("SQL error (editImageDialog2): " + e);
	}
	
	
	//Read the reference, and set true in the ini if it's selected.
	var reference = document.getElementById("reference");
	reftype = reference.selected;
	
	try {
	
	    var mDBConn = trails.openDB();
	    mDBConn.executeSimpleSQL("UPDATE Articles SET reftype = '" + reftype + "' WHERE pageID = '" + this.page + "' AND articleID = '" + this.article + "'");
	
	} catch (e) {
	    alert("SQL error (editImageDialog3): " + e);
	}
    
    trails.updatePreview('previewEdit');
	trails.updatePreview('browser');
    	
	window.close();

},


removeImage: function() {

	var OS = trails.fetchOS();
	var deep_path = trails.ext().path;
	var theImage = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	
	var answer = confirm ("Are you sure you want to remove the image?")
	
	if(answer) {
	
		try {	
		    var mDBConn = trails.openDB();
		    var getStatement = mDBConn.createStatement("SELECT content FROM Articles WHERE pageID = '"+ this.page +"' AND articleID = '" + this.article + "'");
		
			var imageName;
			
		    while (getStatement.executeStep()) {
		        imageName = getStatement.getUTF8String(0);
		    }
		} catch (e) {
		    alert("SQL error (Init2): " + e);
		}	
		
		try {
		    var mDBConn = trails.openDB();
//		    mDBConn.executeSimpleSQL("UPDATE Articles SET content = 'removed' WHERE pageID = '" + page + "' AND articleID = '" + article + "'");
		    mDBConn.executeSimpleSQL("DELETE FROM Articles WHERE pageID = '" + this.page + "' AND articleID = '" + this.article + "'");

   			trails.updatePreview('trails');
		
		} catch (e) {
		    alert("SQL error (removeImage2): " + e);
		}		
		
		try {
			var imagePath;
			if (OS == 'win') {
				var imagePath = deep_path + '\\chrome\\content\\booklet\\' + imageName;
			} else {
				var imagePath = deep_path + '/chrome/content/booklet/' + imageName;
			}
			theImage.initWithPath(imagePath);
			theImage.remove(false);
		} catch (e) {
			alert(e);
		}
        
            trails.updatePreview('previewEdit');
	
		window.close();
	
	}
},

cancelImage: function() {
	window.close();
}

};
