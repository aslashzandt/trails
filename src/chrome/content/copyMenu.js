var trails = {
id: "trails@thecafesociety.org",

/*
Works in FF versions before v4.
Migrated to the directory_service for v4.
ext: Components.classes["@mozilla.org/extensions/manager;1"]
                    .getService(Components.interfaces.nsIExtensionManager)
                    .getInstallLocation("trails@thecafesociety.org")
                    .getItemLocation("trails@thecafesociety.org"),
*/

directoryService: Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties),

ext: function() {
 	var fmDir = this.directoryService.get("ProfD", Components.interfaces.nsIFile); 	
	fmDir.append("extensions");
	fmDir.append("trails@thecafesociety.org");
	return fmDir;
},

desktop: Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("Desk", Components.interfaces.nsIFile),

temp: Components.classes["@mozilla.org/file/directory_service;1"].
                     getService(Components.interfaces.nsIProperties).
                     get("TmpD", Components.interfaces.nsIFile),

// Message on Mac, before publishing on how to set up FF right for the PDF generation.
MAC_PUBLISH_MESSAGE: "IMPORTANT!\n\nPlease save as PDF in the next dialogue, and we'll take care of the rest. (You can always remove a published booklet if you're not happy with it).",

// Message on Mac, before Exporting to PDF.
MAC_EXPORT_PDF_MESSAGE: 'IMPORTANT!\n\nIn case your exported PDF would look malformed,\nplease have a look in the Help documentation.\n\n',

// Trails root for links and publishing.
TRAILS_HTTP_ROOT: "http://trails.thecafesociety.org/",


resizeSidebar: function() {
    try {
        var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
 		.getInterface(Components.interfaces.nsIWebNavigation)
		 .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
		 .rootTreeItem
		 .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
		 .getInterface(Components.interfaces.nsIDOMWindow);
		mainWindow.document.getElementById("sidebar-box").width = 395;
    }
    catch (e) {
    }
},

onLoad: function() {
	this.initialized = true;
	this.resizeSidebar();
	
	//if(document.getElementById('instructionsTable')) {
		if(!this.getTrailsDBFile() || this.getTrailsDBFile() == '') {
			this.turnTrails('off');
			this.showInstructions();
		} else {
			this.turnTrails('on');
			this.hideInstructions();
		}
	//}
	
	var tdb = this.getTrailsDBFile();
	if(!tdb || tdb == '') {
		this.turnTrails('off');
	} else {
		this.setTrailsTitle(tdb.replace(/.trails/g, ''));
	}
},

setTrailsTitle: function(title) {
	mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	 .getInterface(Components.interfaces.nsIWebNavigation)
	 .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
	 .rootTreeItem
	 .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	 .getInterface(Components.interfaces.nsIDOMWindow);
	
	//Works, but the title will not automatically update :-/
	//mainWindow.document.getElementById("viewEmptySidebar").setAttribute('sidebartitle', 'trails - ' + title);
	//Short circuit for now.
	mainWindow.document.getElementById("viewEmptySidebar").setAttribute('sidebartitle', 'trails');
},

showInstructions: function() {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
                       .getService(Components.interfaces.nsIWindowMediator);  
    var mainWindow = wm.getMostRecentWindow("navigator:browser");

	if(mainWindow && mainWindow.sidebar && mainWindow.sidebar.document.getElementById('browserTable')) {
		mainWindow.sidebar.document.getElementById('browserTable').style.display = 'none';
		mainWindow.sidebar.document.getElementById('instructionsTable').style.display = '';
	}
},
hideInstructions: function() {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
                       .getService(Components.interfaces.nsIWindowMediator);  
    var mainWindow = wm.getMostRecentWindow("navigator:browser");

	if(mainWindow && mainWindow.sidebar && mainWindow.sidebar.document.getElementById('browserTable')) {
		mainWindow.sidebar.document.getElementById('browserTable').style.display = '';
		mainWindow.sidebar.document.getElementById('instructionsTable').style.display = 'none';
	}
},

showTrails: function() {
   var commandID = 'viewEmptySidebar';
   var forceOpen = true;
   toggleSidebar(commandID, forceOpen);
},

createBooklet: function() {
	try {
		const nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"]
	             .createInstance(Components.interfaces.nsIFilePicker);
		fp.init(window, "Create Booklet...", nsIFilePicker.modeSave);
		fp.appendFilter("Trails Booklet","*.trails");
		var result = fp.show();
		if(result == 0) {
		    
            var existingFile = Components.classes["@mozilla.org/file/local;1"]
             .createInstance(Components.interfaces.nsILocalFile);
            var destFolder = Components.classes["@mozilla.org/file/local;1"]
             .createInstance(Components.interfaces.nsILocalFile);
			 var copyFile = Components.classes["@mozilla.org/file/local;1"]
             .createInstance(Components.interfaces.nsILocalFile);
			
		    var file = this.ext();
			file.append('trails_clean.sql');
		    existingFile.initWithPath(file.path);
		    destFolder.initWithPath(fp.file.parent.path);
			copyFile.initWithPath(fp.file.path);
			existingFile.copyTo(destFolder, copyFile.leafName + '.trails');
			this.setTrailsTitle(fp.file.leafName.replace(/.trails/g, ''));
			this.setTrailsDBFile(fp.file.path + '.trails');
			this.hideInstructions();
			this.turnTrails('on');
			this.dbAddPage(2);
			this.loadUpPage();
			this.updatePreview('child');
		}	
	} catch(e) {alert(e);}
},

openBooklet: function() {
		const nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"]
                 .createInstance(Components.interfaces.nsIFilePicker);
		fp.init(window, "Save Booklet As...", nsIFilePicker.modeOpen);
		fp.appendFilter("Trails Booklet","*.trails");
		fp.show();
		
		this.setTrailsDBFile(fp.file.path);
		this.setTrailsTitle(fp.file.leafName.replace(/.trails/g, ''));	
		this.restoreImagesFromDB();
		this.hideInstructions();
		this.turnTrails('on');
		this.loadUpPage();
		this.updatePreview('child');
},

restoreImagesFromDB: function() {

	this.cleanBookletFolder();
	
    var mDBConn = this.openDB();
    var getStatement = mDBConn.createStatement('SELECT name, data FROM Images');

    while (getStatement.executeStep()) {
    
    	try {	    
		   	var iDataSize = {value:0};
	      	var aData = {value:null};
			getStatement.getBlob(1, iDataSize, aData);
		  	var name = getStatement.getUTF8String(0);											
			var aFile = Components.classes["@mozilla.org/file/local;1"]
                        .createInstance(Components.interfaces.nsILocalFile);
		
			aFile.initWithPath( this.ext().path );
			aFile.append('chrome'); aFile.append('content'); aFile.append('booklet');
			aFile.append(name);
			
			//Not needed since the flags below will create file.
			//This one gives permissions error, maybe exclusively on ff4?
			//Keeping for safety.
			//aFile.createUnique( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 600);
			            
			var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].
			                       createInstance(Components.interfaces.nsIFileOutputStream);
			stream.init(aFile, 0x04 | 0x08 | 0x20, 0600, 0); // write, create, truncate
			            
	
			var bstream = Components.classes["@mozilla.org/binaryoutputstream;1"].
			                        createInstance(Components.interfaces.nsIBinaryOutputStream);
			                        
			bstream.setOutputStream(stream);
			bstream.writeByteArray(aData.value, iDataSize.value);
	
			if (stream instanceof Components.interfaces.nsISafeOutputStream) {
			    stream.finish();
			} else {
			    stream.close();
			}
		} catch(e) { alert(e); /* Image failed to be written. NEXT! */ }
    }
},

cleanBookletFolder: function() {
	var bFolder = Components.classes["@mozilla.org/file/local;1"]
                  .createInstance(Components.interfaces.nsILocalFile);
	bFolder.initWithPath(this.ext().path);
	bFolder.append('chrome'); bFolder.append('content'); bFolder.append('booklet');
	var entries = bFolder.directoryEntries;
	while(entries.hasMoreElements())
	{
		try {
			var entry = entries.getNext();
			entry.QueryInterface(Components.interfaces.nsIFile);
			
			if(entry.isFile()){
				entry.remove(false);
			}
		} catch(e) { /* Failed to remove this file. NEXT! */ }
	}
},

populatePages: function() {
    //For the Spreads to Remove!
    var menu = document.getElementById("spread-remove");

    for(var i=menu.childNodes.length - 1; i >= 0; i--) {
	    menu.removeChild(menu.childNodes.item(i));
    }

    for (var i=0; i < this.fetchPageCount(); i++) {
        var tempItem = document.createElement("menuitem");
        tempItem.setAttribute("label", (i + 1));
        tempItem.setAttribute("onclick", "trails.removePage(" + (i + 1) + ");");
        menu.appendChild(tempItem);
    }

    //This is for the Page Titles:
    var titleSetMenu = document.getElementById("page-title");

    for(var i=titleSetMenu.childNodes.length - 1; i >= 0; i--) {
	    titleSetMenu.removeChild(titleSetMenu.childNodes.item(i));
    }

    for (var i=0; i < (this.fetchPageCount() * 2); i++) {
        var stItem = document.createElement("menuitem");
        stItem.setAttribute("label", (i + 1));
        stItem.setAttribute("onclick", "trails.setPageTitle(" + (i + 1) + ");");
        titleSetMenu.appendChild(stItem);
    }
},

loadUpPage: function() {

    try {
        //Dumps both files to create new ones from the pages.
		
        var pFile = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsILocalFile);
        pFile.initWithPath(this.ext().path);
		pFile.append('chrome'); pFile.append('content'); pFile.append('preview.html');
		
        if (pFile.exists()) { pFile.remove(true); }
        pFile.create(0, 0666);
		
        var sFile = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsILocalFile);
		
        sFile.initWithPath(this.ext().path);
		sFile.append('chrome'); sFile.append('content'); sFile.append('spreads.html');

        if (sFile.exists()) { sFile.remove(true); }
        sFile.create(0, 0666);
        
        //Both files dumped. Time to create files from pages.

        var previewData = this.addHTMLframe('preview');
        var spreadsData = this.addHTMLframe('spreads');

        var pStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);
                         
        pStream.init(pFile, 0x04 | 0x08 | 0x20, 0600, 0);
        pStream.write(previewData, previewData.length);
        pStream.close();

        var sStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);

        sStream.init(sFile, 0x04 | 0x08 | 0x20, 0600, 0);
        sStream.write(spreadsData, spreadsData.length);
        sStream.close();

    } catch (e) {
        alert(e);
    }
},

addHTMLframe: function(type) {

	//Read out the current page for jquery scrolling.
	var mDBConn = this.openDB()
    if(mDBConn) {
	    var getStatement = mDBConn.createStatement('SELECT currentPage FROM Settings');
	    var currentPage = 0;
	
	    while (getStatement.executeStep()) {
	        currentPage = getStatement.getInt32(0);
	    }
		
		var HTMLtext = 	
		
		'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' +
		'<html xmlns="http://www.w3.org/1999/xhtml">\n' +
		'<head>\n' +
		'<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />\n' +
		'<title>Layout</title>\n';
				
		//if (type == 'preview') { HTMLtext = HTMLtext + '<link href="preview.css" rel="stylesheet" type="text/css" />\n'; }
		//else { HTMLtext = HTMLtext + '<link href="spreads.css" rel="stylesheet" type="text/css" />\n'; }
		HTMLtext = HTMLtext + '<link href="spreads.css" rel="stylesheet" type="text/css" />\n';
		if (type == 'preview') { HTMLtext = HTMLtext + '<link href="preview.css" rel="stylesheet" type="text/css" />\n'; }
		if (type != 'preview') { HTMLtext = HTMLtext + '<link href="print.css" rel="stylesheet" type="text/css" media="print" />\n'; }
		
		HTMLtext = HTMLtext + 
		'<script type="application/x-javascript" src="chrome://trails/content/jquery.js"></script>\n' + 
		'<script type="application/x-javascript" src="chrome://trails/content/scrollTo.js"></script>\n' +
		'<script type="application/x-javascript" src="chrome://trails/content/jquery-impromptu.2.7.min.js"></script>\n' +
		'<script type="application/x-javascript" src="chrome://trails/content/copyMenu.js"></script>\n' +
		'<script type="application/x-javascript" src="chrome://trails/content/styling_etc.js"></script>\n';
		
		if(type != 'preview') { HTMLtext = HTMLtext + '<script type="application/x-javascript">$(document).ready(function() {if(trails.getPublishStatus() == 1){ if(trails.fetchOS() == "mac"){document.title = "dont_change_this_title";} trails.doPublish();} if(trails.getPublishStatus() == 2){document.title = "MyBooklet"; trails.exportToPDF();}});</script>'; }
	
		//Add jquery script for scrolling:
		HTMLtext = HTMLtext + '<script type="text/javascript">\n' +
				'$(window).load(function() {\n' +
					"$.scrollTo.defaults.axis = 'y';\n" +
					"$.scrollTo($('#page" + currentPage + "'));\n" +
				'});\n' +
		'</script>\n';
		
		HTMLtext = HTMLtext + '</head>\n' +
		'<body>\n';
		
        //Add the FullSize attr.
        if(type != 'preview') { HTMLtext = HTMLtext + "<TrailsType type=\"FULL\"></TrailsType>"; }
        
		var loopPages = this.fetchPageCount();
		
		//Loop that reads pages.
		for(var i=1 ; i <= loopPages ; i++) {
		
			HTMLtext = HTMLtext + 
			'<div class="A4Landscape" id="page' + i + '">\n';
		
		//Get the page's settings
		try {
		
		    var mDBConn = this.openDB();
		    var getStatement = mDBConn.createStatement("SELECT columns, created, page1title, page2title FROM Pages WHERE pageID = '"+ i +"'");
		
		    var pageLayout, created, page1title, page2title;
		
		    while (getStatement.executeStep()) {
		        pageLayout = getStatement.getInt32(0);
		        created = getStatement.getUTF8String(1);
		        page1title = getStatement.getUTF8String(2);
		        page2title = getStatement.getUTF8String(3);
		    }
		} catch (e) {
		    alert("SQL error (addHTMLframe2): " + e);
		}
		
		//Unescape the titles for presentation:
		page1title = unescape(page1title);
		page2title = unescape(page2title);
		
		//Calculates the page number, problem beeing that i is the spreads page number and not the A5 pagenumber.
		var iIncrease = i * 2;
		
		HTMLtext = HTMLtext + '<table border="0" cellpadding="0" cellspacing="0">';
		
		HTMLtext = HTMLtext + '<td id="' + (iIncrease - 1) + '" class="pageTitle light' + pageLayout + '1">';
		HTMLtext = HTMLtext + page1title.toUpperCase();
		HTMLtext = HTMLtext + '</td>';
		
		if (type == 'spreads') {HTMLtext = HTMLtext + ' ';}
		HTMLtext = HTMLtext + '<td class="light' + pageLayout + '2">';
		//if (type == 'spreads') {HTMLtext = HTMLtext + '<br/><img src="spacer.png" /><br/><img src="spacer.png" /><br/>';} 
		//if (type == 'preview') {HTMLtext = HTMLtext + '<img src="spacer.png" />';}
		HTMLtext = HTMLtext + '<strong>PAGE ' + (iIncrease - 1) + ' / ' + created.substring(0,created.indexOf(" ")) + '</strong></td>';
		
		//And the right one.
		
		HTMLtext = HTMLtext + '<td id="' + iIncrease + '" class="pageTitle light' + pageLayout + '3">';
		HTMLtext = HTMLtext + page2title.toUpperCase();
		HTMLtext = HTMLtext + '</td>';
		
		HTMLtext = HTMLtext + '<td class="light' + pageLayout + '4">';
		//if (type == 'spreads') {HTMLtext = HTMLtext + '<br/><img src="spacer.png" /><br/><img src="spacer.png" /><br/>';} 
		//if (type == 'preview') {HTMLtext = HTMLtext + '<img src="spacer.png" />';}
		HTMLtext = HTMLtext + '<strong>PAGE ' + (iIncrease) + ' / ' + created.substring(0,created.indexOf(" ")) + '</strong></td>';
		HTMLtext = HTMLtext + '</table>';
		
		//This seems to be needed for the spreads to not be distorted and conflict with the titleField.
			if(type == 'spreads') { HTMLtext = HTMLtext + '<br/>'; }
		//One extra just for the hell of it. To both preview and spreads.
		//HTMLtext = HTMLtext + '<br/>';
		
		//testing overflow FF2 issue
		HTMLtext = HTMLtext + '<div class="overflower">';
	
		if (pageLayout == 1) { HTMLtext = HTMLtext + '<div class="layout1">\n'; }
		if (pageLayout == 2) { HTMLtext = HTMLtext + '<div class="layout2">\n'; }
		if (pageLayout == 3) { HTMLtext = HTMLtext + '<div class="layout3">\n'; }
	
		var articleLoop = this.fetchArticleCount(i);
		
		//anthon edit
		HTMLtext = HTMLtext + '<ul class="articleList">';
		//end anthon edit
		
		for(var j=1 ; j <= articleLoop ; j++) {
	
		    try {
		        var mDBConn = this.openDB();
		        var getStatement = mDBConn.createStatement("SELECT reftype, created, textstyle, content, reference, edittag FROM Articles WHERE pageID = '"+ i +"' AND articleID = '"+ j +"'");
		
		        var currentPage = 0;
		        var theContent, reftype, created, textstyle, type, reference, edittag;
		        
		        while (getStatement.executeStep()) {
		            reftype = getStatement.getUTF8String(0);
		            created = getStatement.getUTF8String(1);
		            textstyle = getStatement.getUTF8String(2);
		            theContent = getStatement.getUTF8String(3);
		            reference = getStatement.getUTF8String(4);
		            edittag = getStatement.getUTF8String(5);
		        }
		    } catch (e) {
		        alert("SQL error (addHTMLframe3): " + e);
		    }
			
			//Only start to write something if the article is NOT removed.
		    if (theContent != 'removed') {
				
				liStyle = (textstyle == "image")? "image" : "text";
			    HTMLtext = HTMLtext + '<li id="' + j + '" class="' + liStyle + '">';
				
		        //Unescape the content for presentation
		        theContent = unescape(theContent);
		        //theContent = theContent.replace(/-/g, "[mikael]");
		        theContent = this.removeShit(theContent);
	        
		        //In the articles, breaks are '\n' but spreads are html.
		        theContent = this.insertNativeBreaks(theContent);
		
				//Reference eller Separator, have to make 2 since RowBreaks have none.
			    
				if(reftype == 'true') { HTMLtext = HTMLtext + "\n" + reference; }
				if(reftype == 'false'){ HTMLtext = HTMLtext + ('\n<hr class="hr1" />'); }
				
				if (textstyle == "special") { HTMLtext = HTMLtext + edittag + j + "," + i + ')">' + "\n" + theContent + '</p>'; }
				if (textstyle == "light") { HTMLtext = HTMLtext + edittag + j + "," + i + ')">' + "\n" + theContent + '</p>'; }
				if (textstyle == "bold") { HTMLtext = HTMLtext + edittag + j + "," + i + ')">' + "\n" + theContent + '</p>'; }
			
				//Set the title length depending on the layout choosen.
				//Not supposed to be as long as normal text.
				if(textstyle == "title") {
			
				//Setting the max length a bit less than the column width, depending on layouts.
				HTMLtext = HTMLtext + '<div class="title' + pageLayout + '">';
			
				//Convert the title to upper case (in the last moment).
				var theTitleUpper = theContent.toUpperCase();
				HTMLtext = HTMLtext + edittag + j + "," + i + ')">' + theTitleUpper + '</h2></div><hr class="hr1" />\n';
			
				}

				if (textstyle == "image") { 
				var imgName = theContent;
				
				if (this.fetchOS() == 'win') { var imagePath = ('booklet\\');
				} else { var imagePath = ('booklet/'); }
				
					//Only write the image if it's "not removed" in the filename string...
					if(imgName != 'removed') {
						HTMLtext = HTMLtext + '<br/>';
						HTMLtext = (HTMLtext + '<img class="artImg" src="' + imagePath + imgName + '"');
						
						if (type == 'preview') {
							if(pageLayout == '1') { HTMLtext = (HTMLtext + ' width="149"'); }
							if(pageLayout == '2') { HTMLtext = (HTMLtext + ' width="77"'); }
							if(pageLayout == '3') { HTMLtext = (HTMLtext + ' width="46"'); }
						}
				
						if (type == 'spreads') {
							if(pageLayout == '1') { HTMLtext = (HTMLtext + ' width="440"'); }
							if(pageLayout == '2') { HTMLtext = (HTMLtext + ' width="228"'); }
							if(pageLayout == '3') { HTMLtext = (HTMLtext + ' width="140"'); }
						}
						HTMLtext = HTMLtext + ' onclick="trails.editImage(' + j + ',' + i + ')" /><br/>';
						HTMLtext = HTMLtext + '<br/>';
					}
				}
			
				//anthon edit
				HTMLtext = HTMLtext + '<div class="removeArticle edit"><img src="images/remove_10_grey.png" /></div>';
				HTMLtext = HTMLtext + '</li>';
				//end anthon edit
				}
			}
			
			//anthon edit
			HTMLtext = HTMLtext + '</ul>';
			//end anthon edit
			
			if (type == 'preview') { HTMLtext = HTMLtext + '\n<hr color="red" />\n'; }
			
			HTMLtext = HTMLtext + '</div>\n';
			HTMLtext = HTMLtext + '</div>\n';
			if(type == 'preview') {
				HTMLtext = HTMLtext + '<div class="pageNumber left">' + (iIncrease - 1) + '</div>\n';
				HTMLtext = HTMLtext + '<div class="pageNumber right">' + iIncrease + '</div>\n';
			}
			HTMLtext = HTMLtext + '<div class="removePage edit"><img src="images/remove_16_grey.png" /></div>\n';
			if(type == 'preview') { HTMLtext = HTMLtext + '<div class="previewPage edit"><img src="images/preview_16_grey.png" /></div>\n'; }
			if(type == 'preview') { HTMLtext = HTMLtext + '<div class="addPageArea"><div id="1" class="addPage edit"><img src="images/oneSpread_grey.png" /></div><div id="2" class="addPage edit"><img src="images/twoSpreads_grey.png" /></div><div id="3" class="addPage edit"><img src="images/threeSpreads_grey.png" /></div></div>\n'; }
			HTMLtext = HTMLtext + '</div>\n\n';
			HTMLtext = HTMLtext + '<div class="sidbrytning">';
			HTMLtext = HTMLtext + '</div>';
			
			//No page break needed on page after last page, will just produce a blank page.
			if(i < this.fetchPageCount()) { HTMLtext = HTMLtext + '<br/>'; }
		}
		
		HTMLtext = HTMLtext + '</body></html>\n';
		return HTMLtext;
	} else {
		//alert("SQL error (addHTMLframe): " + e);
		return false;
	}	
},

ContextPopup :function() {
	gContextMenu.showItem("cls-context-copyparagraph", gContextMenu.isTextSelected);
	gContextMenu.showItem("cls-context-copytitle", gContextMenu.isTextSelected);
},

CreateParagraph: function() {
	var objFocusedWnd = document.commandDispatcher.focusedWindow;
	var objSelection = objFocusedWnd.getSelection();
	var theData = objSelection.toString();

	try {
	    var mDBConn = this.openDB();
	    if(mDBConn) {
		    mDBConn.executeSimpleSQL("UPDATE Settings SET currentReference = '"+ this.getReference() +"'");
	    	this.writeCArticle(theData, "text");
		}
	} catch (e) {
	    alert("SQL error (CreateParagraph): " + e);
	}
},

CreateTitle: function() {
	var objFocusedWnd = document.commandDispatcher.focusedWindow;
	var objSelection = objFocusedWnd.getSelection();
	//gContextMenu.getService('@mozilla.org/widget/clipboardhelper;1', Components.interfaces.nsIClipboardHelper).copyString(objSelection);
	var theData = objSelection.toString();

	try {
	    var mDBConn = this.openDB();
	    if(mDBConn) {
		    mDBConn.executeSimpleSQL("UPDATE Settings SET currentReference = '" + this.getReference() + "'");
	    	this.writeCArticle(theData, "title");
    	}
	} catch (e) {
	    alert("SQL error (CreateTitle): " + e);
	}
},

//Creates a new <p> or <h2> depending on the menu command.
createNew: function(type) {
	if(this.fetchPageCount() > 0) {    
        try {
            var mDBConn = this.openDB();
            mDBConn.executeSimpleSQL("UPDATE Settings SET currentFormatting = '" + type + "', currentArticle = '', currentReference = ''");
        } catch (e) {
            alert("SQL error (createNew): " + e);
        }
        //Pop a new window for the new text.
        window.open('chrome://trails/content/addArticle.xul','Add Article', 'height=350,width=608 menubar=no, location=no, resizable=yes, scrollbars=yes, status=no');
    } else {
		alert('Please add a spread before adding content.');
    }
},

createSpecial: function(type) {

    if(this.fetchPageCount() > 0 ) {
        var pageNumber;
        pageNumber = prompt("What Spread would you like this item(s) on?");
        if ((pageNumber <= this.fetchPageCount()) && (pageNumber > 0)) {
            try {
                var mDBConn = this.openDB();
                mDBConn.executeSimpleSQL("UPDATE Settings SET currentFormatting = ' ' WHERE rowid = '1'");
            }
            catch (e) {
                alert("SQL error (createSpecial): " + e);
            }	

        	var currentArticle = this.fetchArticleCount(pageNumber) + 1;
	        var specialString = ' ';

	        if (type == 'rowBreak') {
	            var howMany;
	            howMany = prompt("How many row breaks to insert?");

	            if (howMany > 10) { alert('You can only add 10 at a time.'); }
	            if (howMany < 1) { alert('You have to add at least one.'); }
	            if ((howMany >= 1) && (howMany <= 10)) {

	                for (var i = 0; i < howMany; i++) {
	                    specialString = specialString + '<br/>';
	                }
	                //If there is a valid number of breaks, write the article.
	                this.storeArticle(specialString, currentArticle, pageNumber, 'special', 'false');
	            }
	        }

	        if(type == 'separator') { specialString = '<hr/>'; this.storeArticle(specialString, currentArticle, pageNumber, 'special', 'false'); }

	        } else if (pageNumber == null) {
        } else {
        	alert('Invalid Spreadnumber!');
        }
    } else {
    	alert('Please add a spread before adding content.');
    }
},

htmlEncode: function() {
	encodedHtml = escape(encodeHtml.htmlToEncode.value);
	encodedHtml = encodedHtml.replace(/\//g,"%2F");
	encodedHtml = encodedHtml.replace(/\?/g,"%3F");
	encodedHtml = encodedHtml.replace(/=/g,"%3D");
	encodedHtml = encodedHtml.replace(/&/g,"%26");
	encodedHtml = encodedHtml.replace(/@/g,"%40");
	encodeHtml.htmlEncoded.value = encodedHtml;
},

toggleTrails: function(commandID, forceOpen) {

   var sidebarBox = document.getElementById("sidebar-box");
   if (!commandID)
     commandID = sidebarBox.getAttribute("sidebarcommand");
 
   var sidebarBroadcaster = document.getElementById(commandID);
   var sidebar = document.getElementById("sidebar");
   var sidebarTitle = document.getElementById("sidebar-title");
   var sidebarSplitter = document.getElementById("sidebar-splitter");

   var broadcasters = document.getElementsByAttribute("group", "sidebar");
   for (var i = 0; i < broadcasters.length; ++i) {

     if (broadcasters[i].localName != "broadcaster")
       continue;
 
     if (broadcasters[i] != sidebarBroadcaster)
       broadcasters[i].removeAttribute("checked");
     else
       sidebarBroadcaster.setAttribute("checked", "false");
   }
 
   sidebarBox.hidden = false;
   sidebarSplitter.hidden = false;
 
   var url = sidebarBroadcaster.getAttribute("sidebarurl");
   var title = sidebarBroadcaster.getAttribute("sidebartitle");
   if (!title)
     title = sidebarBroadcaster.getAttribute("label");
   sidebar.setAttribute("src", url);
   sidebarBox.setAttribute("sidebarcommand", sidebarBroadcaster.id);
   sidebarTitle.value = title;

   sidebarBox.setAttribute("src", url);
 
   if (sidebar.contentDocument.location.href != url)
     sidebar.addEventListener("load", sidebarOnLoad, true);
   else // older code handled this case, so we do it too
     fireSidebarFocusedEvent();
 },


//This function pops the window for adding an article
writeCArticle: function(data, formatting) {
 
 /*
 var broadcasters = document.getElementsByAttribute("group", "sidebar");
 
   for (var i = 0; i < broadcasters.length; ++i) {
     // skip elements that observe sidebar broadcasters and random
     // other elements
     if (broadcasters[i].localName != "broadcaster")
       continue;
 
     if (broadcasters[i] != sidebarBroadcaster)
       broadcasters[i].removeAttribute("checked");
     else
       sidebarBroadcaster.setAttribute("checked", "true");
   }
   */

    if(this.fetchPageCount() > 0) {
        try {
            data = escape(data);
            var mDBConn = this.openDB();
            mDBConn.executeSimpleSQL("UPDATE Settings SET currentFormatting = '"+formatting+"', currentArticle = '"+data+"'");
        } catch (e) {
            alert("SQL error (writeCArticle): " + e);
        }
        window.open('chrome://trails/content/addArticle.xul','Add Article', 'height=350,width=608 menubar=no, location=no, resizable=yes, scrollbars=yes, status=no');
    } else {
        alert('Please add a spread before adding content.');
    }
},


setPageTitle: function(sideNumber) {

    var theTitle = prompt('Write the title (max 40 characters)');
    if (theTitle == '') { theTitle = ' '; }

    if(theTitle.length < 60) {

	    //Take the sideNumber you choosed and get the pageNumber of the page.
	    //sideNumber is 1 or 2. pageNumber is the current page of the side.
	    var pageNumber;

	    if (this.isEven(sideNumber)) {
	    	pageNumber = sideNumber / 2;
	    } else {
	    	pageNumber = (sideNumber / 2); pageNumber = (Math.round(pageNumber));
	    }

	    //Encode the page title for storage
	    theTitle = escape(theTitle);

	    try {
			var mDBConn = this.openDB();
			if(!this.isEven(sideNumber)) {
				mDBConn.executeSimpleSQL("UPDATE Pages SET page1title = '" + theTitle + "' WHERE pageID = '" + pageNumber + "'");
			} else {
				mDBConn.executeSimpleSQL("UPDATE Pages SET page2title = '" + theTitle + "' WHERE pageID = '" + pageNumber + "'");
			}
			mDBConn.executeSimpleSQL("UPDATE Settings SET currentPage = '"+pageNumber+"'");
			this.updatePreview('child');
			this.updatePreview('browser');
	    } catch (e) {
	        alert("SQL error (setPageTitle): " + e);
    	}
    } else { alert('Too long title'); }
},

//Just returns true if the number you give it is even.
isEven: function(value){
	if (value%2 == 0)
		return true;
	else
		return false;
},

editArticle: function(article, page) {
	try {
        var mDBConn = this.openDB();
        var Statement = mDBConn.executeSimpleSQL("UPDATE Settings SET currentArticle = '" + article + "', currentPage = '"+page+"'");
    } catch (e) {
        alert("SQL error (editArticle): " + e);
    }
	window.open('chrome://trails/content/editArticle.xul','Edit Article', 'height=350,width=608 menubar=no, location=no, resizable=yes, scrollbars=yes, status=no');
},

editImage: function(article, page) {
	try {
	    var mDBConn = this.openDB();
	    var Statement = mDBConn.executeSimpleSQL("UPDATE Settings SET currentArticle = '" + article + "', currentPage = '" + page + "'");
	} catch (e) {
	    alert("SQL error (editImage): " + e);
	}
	window.open('chrome://trails/content/editImage.xul','Edit Image', 'height=375,width=608 menubar=no, location=no, resizable=yes, scrollbars=yes, status=no');
},

getImageExtension: function() {
    var link = gContextMenu.target.src;
    var extension = link.substring(link.lastIndexOf('.'), link.length);
	
	//Fix for cache breakers, etc image.jpg?version=123
	if(extension.indexOf('?') > 0){
		extension = extension.substring(0, extension.indexOf('?'));
	}
	return extension;
},

getImageURL: function() {
    var img = gContextMenu.target;
    var strImgURL = img.src;
    return strImgURL;
},

// The allmighty save image function...
saveImage: function() {
	var pagesCount = this.fetchPageCount();
	if(pagesCount > 0) {
        if (gContextMenu.onImage == true) {

            try {

				var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
				    createInstance(Components.interfaces.nsIWebBrowserPersist);
				const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
				const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
				persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
				
				var theImage = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
				
				do {
					var randomnumber = Math.floor(Math.random() * 10000001);
					destImageName = randomnumber + this.getImageExtension();

					theImage.initWithPath(trails.ext().path);
					theImage.append('chrome'); theImage.append('content');
					theImage.append('booklet'); theImage.append(destImageName);
				} while (theImage.exists());

				var imageBytes = this.GetImageFromURL(this.getImageURL());

				var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].
				                       createInstance(Components.interfaces.nsIFileOutputStream);
				stream.init(theImage, 0x04 | 0x08 | 0x20, 0600, 0); // write, create, truncate

				var bstream = Components.classes["@mozilla.org/binaryoutputstream;1"].
				                        createInstance(Components.interfaces.nsIBinaryOutputStream);

				bstream.setOutputStream(stream);
				bstream.writeBytes(imageBytes, imageBytes.length);

				if (stream instanceof Components.interfaces.nsISafeOutputStream) { stream.finish(); } else { stream.close(); }		
				
				try {
		            var gImageURL = this.getImageURL();
		            
		            var mDBConn = this.openDB();
		            mDBConn.executeSimpleSQL("UPDATE Settings SET currentImage = '" + theImage.leafName + "', currentReference = '" + this.getReference() + "', currentText = '" + this.getImageURL() + "'");
	            } catch (e) {
	                alert("SQL error (saveImage): " + e);
	            }
				
            } catch (e) {
                alert(e);
            }
            window.open('chrome://trails/content/addImage.xul', 'Add Image', 'height=375,width=608 menubar=no, location=no, resizable=yes, scrollbars=yes, status=no');
        } else {
            alert("This is not a valid image!");
        }
    } else if (pagesCount == 0) {
       alert('Please add a spread before adding an image.');
    }
},

GetImageFromURL: function(url) { 
  var ioserv = Components.classes["@mozilla.org/network/io-service;1"] 
    .getService(Components.interfaces.nsIIOService); 
  var channel = ioserv.newChannel(url, 0, null); 
  var stream = channel.open(); 

  if (channel instanceof Components.interfaces.nsIHttpChannel && channel.responseStatus != 200) { 
    return ""; 
  }

  var bstream = Components.classes["@mozilla.org/binaryinputstream;1"] 
    .createInstance(Components.interfaces.nsIBinaryInputStream); 
  bstream.setInputStream(stream);

  var size = 0; 
  var file_data = ""; 
  while(size = bstream.available()) { 
    file_data += bstream.readBytes(size); 
  } 

  return file_data; 
},


fetchOS: function() {
	var OS = navigator.platform;
	if (OS == "Win32") { return "win"; } else { return "mac"; }
},

//Need to have a good pageNumber checker, now it's double with the saveArticle() function.

storeArticle: function(ArticleData, articleNumber, pageNumber, formatting, reference, cols) {

    try {

        while ((pageNumber > this.fetchPageCount()) && (pageNumber > 0)) {
            alert('Invalid Pagenumber!');
            pageNumber = prompt("What Page would you like this Article on?");
        }

        if (pageNumber != null) {
            var articleNumber = (this.fetchArticleCount(pageNumber));
            //The existing plus one.
            articleNumber++;

            try {
                var mDBConn = this.openDB();
                var getStatement = mDBConn.createStatement("SELECT currentReference, currentText FROM Settings");

                //The currentURL is for IMAGE.
                var currentReference, currentURL;

                while (getStatement.executeStep()) {
                    currentReference = getStatement.getUTF8String(0);
                    currentURL = getStatement.getUTF8String(1);
                }
            } catch (e) {
                alert("SQL error (storeArticle): " + e);
            }

			//Get the layout since we need to apply different classes to the paragraphs depending on the layout.
	        var pageLayout = cols;

			//Read the current reference data:
			var referenceUrl = currentReference;
			var klockan = new Date();
			var timmar = klockan.getHours();
			//Adds a zero just to make 2 digit clock.
			if (timmar < 10) {timmar = '0' + timmar;}
			var minuter = klockan.getMinutes();
			if (minuter < 10) {minuter = '0' + minuter;}

			//ENABLING/DISABLING CONCATINATION OF LOCATION
			var l;
			switch(pageLayout) {
			  	case 1:
			    l = 42;
			    break;
			   case 2:
			    l = 42;
			    break;
			   case 3:
			    l = 24;
			    break;
			}
			var referenceTitle = referenceUrl.toString().substring(0,l) + '...';
			var referenceTag = '<div class="reference">URL: <a href="' + referenceUrl + '" target="blank">' + referenceTitle + '</a><br/>Time: ' + timmar + ':' + minuter + '</div>';

            if (formatting == "light") { var fString = '<p class="light' + pageLayout + '" onclick="trails.editArticle('; }
            if (formatting == "bold") { var fString = '<p class="bold' + pageLayout + '" onclick="trails.editArticle('; }
            if (formatting == "title") { var fString = '<h2 class="lay' + pageLayout + '" onclick="trails.editArticle('; }

            //The special (only row breaks right now) will not have either reference nor separator, but needs formatting and editing (removal).
            if (formatting == "special") { var fString = '<p class="light' + pageLayout + '" onclick="trails.editArticle('; reference = "none"; }

            //Set the current page:
            try {
                var mDBConn = this.openDB();
                mDBConn.executeSimpleSQL("UPDATE Settings SET currentPage = '" + pageNumber + "'");
            } catch (e) {
                alert("SQL error (storeArticle3): " + e);
            }

            //Store the article in the database.
            try {

                //Escape the article data for storage.
                ArticleData = escape(ArticleData);

                var mDBConn = this.openDB();
                if (formatting == 'image') {
                    mDBConn.executeSimpleSQL('INSERT INTO Articles ("articleID","pageID","reftype","created","textstyle", "content", "reference", "edittag", "URL") ' + "VALUES ('" + articleNumber + "','" + pageNumber + "','" + reference + "','" + this.getDateAndTime() + "','" + formatting + "','" + ArticleData + "','" + referenceTag + "','" + fString + "', '" + currentURL + "')");
                    return articleNumber;
                } else {
                    mDBConn.executeSimpleSQL('INSERT INTO Articles ("articleID","pageID","reftype","created","textstyle", "content", "reference", "edittag") ' + "VALUES ('" + articleNumber + "','" + pageNumber + "','" + reference + "','" + this.getDateAndTime() + "','" + formatting + "','" + ArticleData + "','" + referenceTag + "','" + fString + "')");
                    }

            } catch (e) {
                alert("SQL error (storeArticle4): " + e);
            }

//          updatePreview();
        }
    } catch (e) {
        alert(e);
    }    
},

getReference: function(cols) {
	return content.location;
},

getTimestamp: function() {

//MySQL compatible, is also used for publishing (don't change format!)
	var rightNow = new Date();
	var nowDate = rightNow.getDate();
	if (nowDate < 10) {nowDate = '0' + nowDate;}
	var nowMonth = (rightNow.getMonth() + 1);
	if (nowMonth < 10) {nowMonth = '0' + nowMonth;}
	var nowYear = rightNow.getFullYear();
	
	return (nowDate + '.' + nowMonth  + '.' + nowYear);
},

fetchPageCount: function() {

    try {
        var mDBConn = this.openDB();
        if(mDBConn) {
        
            var pageCount = 0;
	        var getStatement = mDBConn.createStatement("SELECT * FROM pages");
	        
            while (getStatement.executeStep()) {
	            pageCount++;
	        }
	        return pageCount;
	    } else { return -1; }

    } catch (e) {
        alert("SQL error (fetchPageCount): " + e);
    }
},

fetchArticleCount: function(pageNumber) {

    try {
        var mDBConn = this.openDB();
        var getStatement = mDBConn.createStatement("SELECT * FROM Articles WHERE pageID = '" + pageNumber + "'");
        var articleCount = 0;

        //SELECT COUNT is not supported, so loop through results and update counter.
        while (getStatement.executeStep()) {
            articleCount++;
        }
        return articleCount;
    } catch (e) {
        alert("SQL error (fetchArticleCount): " + e);
    }
},


//Writes 'removed' to the content, which signals the HTMLtext function to not write it at all = deleted.
removeImage: function(pageNumber) {

	var answer;
	answer = confirm("Do you want to remove the selected image?");

	if(answer) {
		
		try {
		    var mDBConn = this.openDB();
		    mDBConn.executeSimpleSQL("DELETE FROM Articles WHERE pageID = '" + page + "' AND articleID = '" + article + "'");
		    mDBConn.executeSimpleSQL("DELETE FROM Images WHERE pId = '" + page + "' AND aId = '" + article + "'");
		
		} catch (e) {
		    alert("SQL error (removeImage2): " + e);
		}
	}
},

removePage: function(pageNumber) {
	
	var answer;
	answer = confirm("Do you want to remove spread number " + pageNumber + "?");

	if(answer) {

		var pages = this.fetchPageCount(); //Total number of pages on the page.
	
		try {
		    var mDBConn = this.openDB();
		    
			//Remove the images from booklet folder.
		    var statem = mDBConn.createStatement("SELECT name FROM Images WHERE pId = '" + pageNumber + "'");
		    var imageName = '';
		    while(statem.executeStep()) {
		    	imageName = statem.getUTF8String(0);
		    	
		    	var theImage = Components.classes["@mozilla.org/file/local;1"].
		    	createInstance(Components.interfaces.nsILocalFile);
		    	
		    	theImage.initWithPath(this.ext().path);
		    	theImage.append('chrome');
		    	theImage.append('content');
		    	theImage.append('booklet');
		    	theImage.append(imageName);
		    	
		    	theImage.remove(false);
		    }
		    
	        //Remove the page
		    mDBConn.executeSimpleSQL("DELETE FROM Pages WHERE pageID = '" + pageNumber + "'");
		    mDBConn.executeSimpleSQL("DELETE FROM Articles WHERE pageID = '" + pageNumber + "'");
		    mDBConn.executeSimpleSQL("DELETE FROM Images WHERE pId = '" + pageNumber + "'");
	
		    //Now we need to adjust the pages, and move all above the removed, one step up.
		    var getStatement = mDBConn.createStatement("SELECT * FROM pages WHERE pageID > '" + pageNumber + "'");
	
		    var higherPages = 0;
	
		    while (getStatement.executeStep()) {
		        higherPages++;
		    }
	
		    //We know how many pages we need to move.
	        //Set pageID = pageID - 1, pa alla higher.
		    var pageToUpdate = pageNumber;
	
		    while (higherPages > 0) {
		        pageToUpdate++;
		        mDBConn.executeSimpleSQL("UPDATE Pages SET pageID = '" + (pageToUpdate - 1) + "' WHERE pageID = '" + pageToUpdate + "'");
		        mDBConn.executeSimpleSQL("UPDATE Articles SET pageID = '" + (pageToUpdate - 1) + "' WHERE pageID = '" + pageToUpdate + "'");
		        mDBConn.executeSimpleSQL("UPDATE Images SET pId = '" + (pageToUpdate - 1) + "' WHERE pId = '" + pageToUpdate + "'");
		        higherPages--;
		    }
	
		} catch (e) {
		    alert("SQL error (removePage): " + e);
		}
		
		if(window.opener != null) {
			this.updatePreview('browser');
		} else {
			this.updatePreview('child');
		}
	}
},

updatePreview: function(ext) {

	if(ext == 'browser') {
		if(window.opener != null) {
			if(window.opener.document.getElementById('sidebar')) {
				theSidebar = window.opener.document.getElementById('sidebar').contentWindow.document.getElementById('browserTable').contentWindow;
			} else {
				theSidebar = window.opener.window;
			}
			try{
		        this.loadUpPage();
		        theSidebar.location.reload(true);
	        
		    } catch(e) {
		        alert(e);
		    }
		}
	} else if(ext == 'trails') {
		theSidebar = window.opener.window;
		try{
	        this.loadUpPage();
	        theSidebar.location.reload(true);
	        
	    } catch(e) {
	        alert(e);
	    }
    } else if(ext == 'previewEdit') {
        //This one is for usage in an edit dialog popped from the preview (opener.opener).
        if(window.opener.opener) {
            try {
                theSidebar = window.opener.opener.window;
                this.loadUpPage();
                theSidebar.location.reload(true);
            } catch(e) {
                alert(e);
            }
        }
	} else if(ext == 'context') {
		theSidebar = window.document.getElementById('sidebar').contentWindow.document.getElementById('browserTable').contentWindow;
		try{
	        this.loadUpPage();
	        theSidebar.location.reload(true);
	        
	    } catch(e) {
	        alert(e);
	    }  
	} else if(ext == 'child') {
		theSidebar = window;
	    try{
        	this.loadUpPage();
       	 	theSidebar.location.reload(true);
       	 
    	} catch(e) {
        	alert(e);
    	}   	
	} else {
		theSidebar = document.getElementById("browserTable");
	    try{
    	    theSidebar.setAttribute('src', 'about:blank');
        	this.loadUpPage();
       	 	theSidebar.setAttribute('src', 'chrome://trails/content/preview.html');
       	 
    	} catch(e) {
        	alert(e);
    	}
    }

/*    
    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow);
	
	var theSidebar = mainWindow.window.document.getElementById('sidebar').contentWindow.document.getElementById('browserTable');
	alert(theSidebar.getAttribute('src'));
	
	if(theSidebar.contentWindow || theSidebar.window) {
		loadUpPage();
		theSidebar.window.location.reload(true);
		alert("win!");
	} else {
		theSidebar.setAttribute('src', 'about:blank');
		loadUpPage();
//		theSidebar.setAttribute('src', 'chrome://trails/content/preview.html');
		alert("src!");
	}
	*/
},


saveTrailsMargins: function() {

    try {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("print.");

        if (this.fetchOS() == 'win') {

            var winPrinter = prefs.getCharPref("print_printer");

            var realPrinter = winPrinter.replace(/ /g, "_");

            prefs.setCharPref('printer_' + realPrinter + '.print_margin_top', 0);
            prefs.setCharPref('printer_' + realPrinter + '.print_margin_bottom', 0);
            prefs.setCharPref('printer_' + realPrinter + '.print_margin_left', 0);
            prefs.setCharPref('printer_' + realPrinter + '.print_margin_right', 0);
            
            prefs.setCharPref('printer_' + realPrinter + '.print_headerleft', "");
            prefs.setCharPref('printer_' + realPrinter + '.print_headercenter', "");
            prefs.setCharPref('printer_' + realPrinter + '.print_headerright', "");
            prefs.setCharPref('printer_' + realPrinter + '.print_footerleft', "");
            prefs.setCharPref('printer_' + realPrinter + '.print_footercenter', "");
            prefs.setCharPref('printer_' + realPrinter + '.print_footerright', "");


            prefs.setIntPref('printer_' + realPrinter + '.print_orientation', 1);
        } else {
            prefs.setCharPref('print_margin_top', 0);
            prefs.setCharPref('print_margin_bottom', 0);
            prefs.setCharPref('print_margin_left', 0);
            prefs.setCharPref('print_margin_right', 0);
            
            prefs.setCharPref('print_headerleft', "");
            prefs.setCharPref('print_headercenter', "");
            prefs.setCharPref('print_headerright', "");
            prefs.setCharPref('print_footerleft', "");
            prefs.setCharPref('print_footercenter', "");
            prefs.setCharPref('print_footerright', "");

            prefs.setIntPref('print_orientation', 1);
        }

        alert('Print margins adjusted for trails successfully!');
    } catch (e) {
        alert('Error setting margins automatically: \n' + 'To fix this, print any document to any printer, then try again.');
    }
    
},


resetMarginsToDefault: function() {

    try {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("print.");

        if (this.fetchOS() == 'win') {

            var winPrinter = prefs.getCharPref("print_printer");

            var realPrinter = winPrinter.replace(/ /g, "_");

            prefs.setCharPref('printer_' + realPrinter + '.print_margin_top', 0.5);
            prefs.setCharPref('printer_' + realPrinter + '.print_margin_bottom', 0.5);
            prefs.setCharPref('printer_' + realPrinter + '.print_margin_left', 0.5);
            prefs.setCharPref('printer_' + realPrinter + '.print_margin_right', 0.5);
            
            prefs.setCharPref('printer_' + realPrinter + '.print_headerleft', "&T");
            prefs.setCharPref('printer_' + realPrinter + '.print_headercenter', "");
            prefs.setCharPref('printer_' + realPrinter + '.print_headerright', "&U");
            prefs.setCharPref('printer_' + realPrinter + '.print_footerleft', "&PT");
            prefs.setCharPref('printer_' + realPrinter + '.print_footercenter', "");
            prefs.setCharPref('printer_' + realPrinter + '.print_footerright', "&D");


            prefs.setIntPref('printer_' + realPrinter + '.print_orientation', 0);
        } else {
            prefs.setCharPref('print_margin_top', 0.5);
            prefs.setCharPref('print_margin_bottom', 0.5);
            prefs.setCharPref('print_margin_left', 0.5);
            prefs.setCharPref('print_margin_right', 0.5);
            
            prefs.setCharPref('print_headerleft', "&T");
            prefs.setCharPref('print_headercenter', "");
            prefs.setCharPref('print_headerright', "&U");
            prefs.setCharPref('print_footerleft', "&PT");
            prefs.setCharPref('print_footercenter', "");
            prefs.setCharPref('print_footerright', "&D");

            prefs.setIntPref('print_orientation', 0);
        }

        alert('Print margins reset to default values successfully!');
    } catch (e) {
        alert('Error setting margins automatically: \n' + 'To fix this, print any document to any printer, then try again.');
    }
},


dbAddPage: function(column) {

	var thisPage = parseInt(this.getHighestPage()) + 1;
	var todayDateAndTime = this.getDateAndTime();

    try {
        var mDBConn = this.openDB();
        mDBConn.executeSimpleSQL('INSERT INTO Pages ("pageID","columns","created","page1title","page2title") ' + "VALUES ('" + thisPage + "','"+ column +"','"+todayDateAndTime+"','','')");
		mDBConn.executeSimpleSQL("UPDATE Settings SET currentColumns = '" + column + "', currentPage = '" + thisPage + "'");
    } catch (e) {
        alert("SQL error (dbAddPage): " + e);
    }
    this.updatePreview();
},

addPageAfter: function(pi,columns) {
	
	//set new index
	var thisPage = parseInt(pi) + 1;
	var todayDateAndTime = this.getDateAndTime();

    try {
        var mDBConn = this.openDB();
        mDBConn.executeSimpleSQL("UPDATE Pages SET pageID = pageID + 1 WHERE pageID >= '" + thisPage + "'");
        mDBConn.executeSimpleSQL("UPDATE Articles SET pageID = pageID + 1 WHERE pageID >='" + thisPage + "'");
        mDBConn.executeSimpleSQL('INSERT INTO Pages ("pageID","columns","created","page1title","page2title") ' + "VALUES ('" + thisPage + "','"+ columns +"','"+todayDateAndTime+"','','')");
		mDBConn.executeSimpleSQL("UPDATE Settings SET currentColumns = '" + columns + "', currentPage = '" + thisPage + "'");
    } catch (e) {
        alert("SQL error (addPageAt): " + mDBConn.lastErrorString);
    }
},

getTrailsDBFile: function() {
	try {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("trails.");
		var status = prefs.getCharPref('booklet_file');
		return status;
	} catch(e) {
		return false;
	}
},

setTrailsDBFile: function(fileName) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("trails.");
	prefs.setCharPref('booklet_file', fileName);
},

openDB: function() {
	var prefDB = this.getTrailsDBFile();
	if(prefDB) {
		var fileToOpen = '';
		if(prefDB.length > 0) {
		    var pFile = Components.classes["@mozilla.org/file/local;1"]
		         .createInstance(Components.interfaces.nsILocalFile);
	        pFile.initWithPath(prefDB);
	        if(pFile.exists()) {
	        	fileToOpen = pFile; 
	    	} else {
	        	this.setTrailsDBFile('');
	        	this.loadUpPage();
        		alert("Error reading booklet!\n\nPlease reopen it or create a new one."); 
				this.turnTrails('off');
				this.showInstructions();
	        	return null;
	       	}
	   	}
	    var storageService = Components.classes['@mozilla.org/storage/service;1']
	                        .getService(Components.interfaces.mozIStorageService);
	    var mDBConn = storageService.openDatabase(fileToOpen);
	    return mDBConn;
	} else {
		return false;
	}
},

//Gets the current highest page by looping through them all.
getHighestPage: function() {
    try {
    
        var mDBConn = this.openDB();
        var getStatement = mDBConn.createStatement('SELECT * FROM pages');

        var highestPage = 0;

        while (getStatement.executeStep()) {
            var pageID = getStatement.getUTF8String(0);
            if(pageID > highestPage)
                highestPage = pageID;
        }
        return highestPage;
    } catch (e) {
        alert("SQL error (getHighestPage): " + e);
    }
},

//Gets the number of articles by looping through them all.
getTotalArticles: function() {

    try {
        var mDBConn = this.openDB();
        var getStatement = mDBConn.createStatement('SELECT COUNT(*) FROM articles');
        var totalArticles = 0;
        while (getStatement.executeStep()) {
            totalArticles = getStatement.getInt32(0);
        }
        return totalArticles;
    } catch (e) {
        alert("SQL error (getTotalArticles): " + e);
    }
},

//Gets the current highest page by looping through them all.
getHighestArticleInPage: function(pageID) {
    try {
    
        var mDBConn = this.openDB();
        var getStatement = mDBConn.createStatement("SELECT * FROM articles WHERE pageID = '"+pageID+"'");
        var highestArticle = 0;
        while (getStatement.executeStep()) {
            var articleID = getStatement.getUTF8String(0);
            if(articleID > highestArticle)
                highestArticle = articleID;
        }
        return highestArticle;
    } catch (e) {
        alert("SQL error (getHighestArticleInPage): " + e);
    }
},

getDateAndTime: function() {
    
    var cD = new Date();
    
    //Have to add compensation since index is 0.
    var months = cD.getMonth() + 1;
    if(months < 10) 
        months = "0" + months;
        
    //No compensation needed since it's a "real" value, showing the date.
    var days = cD.getDate();
    if(days < 10) 
        days = "0" + days;
    
    var returnTD = cD.getFullYear() + "-" + months + "-" + days;
    
    var hours = cD.getHours();
    if(hours < 10) 
        hours = "0" + hours;
        
    var minutes = cD.getMinutes();
    if(minutes < 10) 
        minutes = "0" + minutes;
        
    var seconds = cD.getSeconds();
    if(seconds < 10) 
        seconds = "0" + seconds;
         
    returnTD += " " + hours + ":" + minutes + ":" + seconds;
    
    return returnTD;  
},

Debug: function() {

},

getPublishStatus: function() {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("trails.");
	var status = prefs.getIntPref('publish');
	return status;
},

setPublishStatus: function(status) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("trails.");
	prefs.setIntPref('publish', status);
},

Publish: function() {

	this.setPublishStatus(1);
	window.open('spreads.html', 'Spreads', 'height=1,width=1, menubar=no, location=no, resizable=no, scrollbars=no, status=no');
	window.close();
},

exportedPDFpresent: function() {

	var pdfFile = '';
	if (this.fetchOS() == 'win') { pdfFile = this.ext().path + '\\dont_change_this_title.pdf'; } else { pdfFile = this.desktop.path + '/dont_change_this_title.pdf'; }
	var pFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	pFile.initWithPath(pdfFile);  

return pFile.exists();		
},

CancelPublish: function() {

    var pdfFile = Components.classes["@mozilla.org/file/local;1"]
                 .createInstance(Components.interfaces.nsILocalFile);

    pdfFile.initWithPath(this.ext().path);
	pdfFile.append('dont_change_this_title.pdf');
    
    if (pdfFile.exists()) {pdfFile.remove(false);}
    
	window.close();
},

sendPublishedData: function() {

	var emailOK = false;
	var inputEmail = window.document.getElementById('booklet-author-email').value;
	inputEmail = inputEmail.replace(/ /g, "");
	if(inputEmail != "" && this.checkEmail(inputEmail)) {emailOK = true;}


	if(this.exportedPDFpresent()) {
	if(emailOK) {	
	
	    window.document.getElementById('PublishButton').disabled = true;
	    window.document.getElementById('CancelButton').disabled = true;
	    window.document.getElementById('PublishButton').label = "Publishing...";
		window.document.getElementById('spinner').hidden = false;
	
	    try {
	
	        var pdfPath = '';
	
	        if (this.fetchOS() == 'win') {
	            var pdfPath = (this.ext().path + '\\dont_change_this_title.pdf');
	        } else { pdfPath = (this.desktop.path + '/dont_change_this_title.pdf'); }
	
	        var pdfFile = Components.classes["@mozilla.org/file/local;1"]
	                     .createInstance(Components.interfaces.nsILocalFile);
	
	        pdfFile.initWithPath(pdfPath);
	        
	        
	        var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]  
	                            .createInstance(Components.interfaces.nsIFileInputStream);
	        stream.init(pdfFile, 0x04 | 0x08, 0644, 0x04);    
	
	        var mimeType = "text/plain";  
	        try {  
	                var mimeService = Components.classes["@mozilla.org/mime;1"]  
	                .getService(Components.interfaces.nsIMIMEService);
	                mimeType = mimeService.getTypeFromFile(pdfFile); 
	        }  
	        catch(e) { }  
	           
	        var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
	                         .createInstance(Components.interfaces.nsIXMLHttpRequest);
	
	        var url = this.TRAILS_HTTP_ROOT + "putfile.php";
	        req.open('PUT', url, false); 
	        req.setRequestHeader('Content-Type', mimeType);  
	        req.send(stream);
	        
			pdfFile.remove(false);
			
	        var response = req.responseText;
	       
	     
	     if (response.indexOf("success") >= 0) {
	
	         var url = this.TRAILS_HTTP_ROOT + "publish.php";
	         
	         det = new XMLHttpRequest();
	         det.open('POST', url, false);
	
	         var formName = window.document.getElementById('booklet-author-name').value;
	         var formLocation = window.document.getElementById('booklet-author-location').value;
	         var formEmail = window.document.getElementById('booklet-author-email').value;
	         var formTitle = window.document.getElementById('booklet-title').value;
	         var formDesc = window.document.getElementById('booklet-description').value;
	         
	         var ticketNo = response.substr(8, response.length);
	
	         var params = "ticket=" + ticketNo + "&name=" + formName + "&location=" + formLocation + "&email=" + formEmail + "&title=" + formTitle + "&desc=" + formDesc + "&published=" + this.getDateAndTime();
	
	         det.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	         det.setRequestHeader("Content-length", params.length);
	         det.setRequestHeader("Connection", "close");
	         det.send(params);
	
	         if (det.responseText == 'success') {
	             var answer = confirm('Published Booklet Successfully!\n\nDo you want to view it online?');
	             if (answer) { window.open(this.TRAILS_HTTP_ROOT + 'index.php?ticket=' + ticketNo, 'Spreads', 'height=600,width=800, menubar=yes, location=yes, resizable=yes, scrollbars=no, status=yes'); }
	         }
	         else { alert(det.responseText); }    
	     }
	     else { alert(response); }
	
	 //If publishing is disabled, message will be shown here.
	 } catch (e) { alert(e); }
	    
	    window.close();
	    	    
	} else {alert("Please enter a valid email address.");}    	    
	} else { alert("The exported PDF file does not exist!"); }
},

doPublish: function() {

	try {
	    var webBrowserPrint = window.content.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	    .getInterface(Components.interfaces.nsIWebBrowserPrint);
	
	    var PSSVC = Components.classes["@mozilla.org/gfx/printsettings-service;1"]
	    .getService(Components.interfaces.nsIPrintSettingsService);
	
	    var printSettings = PSSVC.newPrintSettings;
		var printFile = '';
		
		if (this.fetchOS() == 'win') {
		    printFile = this.ext().path + '\\dont_change_this_title.pdf';
		    printSettings.printSilent = true;
		} else {
		    printFile = this.desktop.path + '/dont_change_this_title.pdf';
		    printSettings.printSilent = false;
		}

		/* remove texts in header/footer */
		printSettings.footerStrCenter = "";
		printSettings.footerStrLeft = "";
		printSettings.footerStrRight = "";
		printSettings.headerStrCenter = "";
		printSettings.headerStrLeft = "";
		printSettings.headerStrRight = "";
	
	    printSettings.printToFile = true;
	    printSettings.toFileName = printFile;
	    printSettings.outputFormat = Components.interfaces.nsIPrintSettings.kOutputFormatPDF;
	    printSettings.orientation = Components.interfaces.nsIPrintSettings.kLandscapeOrientation;
		
       	webBrowserPrint.print(printSettings, null);
	    window.close();

	} catch (e) { window.close(); }
},

openExportToPDF: function() {

	var doExport = true;

	if (this.fetchOS() == 'mac') {
		doExport = confirm(this.MAC_EXPORT_PDF_MESSAGE);
	}
	
	if(doExport) {
		this.setPublishStatus(2);
		window.open('spreads.html', 'Spreads', 'height=1,width=1, menubar=no, location=no, resizable=no, scrollbars=no, status=no');
		window.close();
	}
},

exportToPDF: function() {

	try {
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var picker = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		picker.init(window, "Save Document as PDF", nsIFilePicker.modeSave);
		picker.appendFilter("PDF", "*.pdf");
		picker.defaultExtension = "pdf";
		picker.defaultString = content.document.title;

		if (this.fetchOS() == 'win') {
		    picker.displayDirectory = this.desktop;
			picker.show();
		}
		
		var webBrowserPrint = window.content.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
		.getInterface(Components.interfaces.nsIWebBrowserPrint);
		
		var PSSVC = Components.classes["@mozilla.org/gfx/printsettings-service;1"]
		.getService(Components.interfaces.nsIPrintSettingsService);
		
		var printSettings = PSSVC.newPrintSettings;
		
		if (this.fetchOS() == 'win') {
		    printSettings.printSilent = true;
		    printSettings.toFileName = picker.file.path;
		} else {
		    printSettings.printSilent = false;
		}
		
		/* remove texts in header/footer */
		printSettings.footerStrCenter = "";
		printSettings.footerStrLeft = "";
		printSettings.footerStrRight = "";
		printSettings.headerStrCenter = "";
		printSettings.headerStrLeft = "";
		printSettings.headerStrRight = "";

		printSettings.printToFile = true;
		printSettings.orientation = Components.interfaces.nsIPrintSettings.kLandscapeOrientation;
		printSettings.outputFormat = Components.interfaces.nsIPrintSettings.kOutputFormatPDF;
				
		webBrowserPrint.print(printSettings, null);

	} catch (e) {  }
	
	window.close();
},

OpenPublish: function() {

	var doPublish = true;

	if (this.fetchOS() == 'mac') {
		doPublish = confirm(this.MAC_PUBLISH_MESSAGE);
	}
	
	if(doPublish) {

	    this.Publish();
	
		window.open('chrome://trails/content/publishWindow.xul','Publish', 'height=535,width=400 menubar=no, location=no, resizable=no, scrollbars=yes, status=no');
	}
},

OpenTabWith: function(url) {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
                       .getService(Components.interfaces.nsIWindowMediator);  
    var mainWindow = wm.getMostRecentWindow("navigator:browser");  
    mainWindow.gBrowser.selectedTab = mainWindow.gBrowser.addTab(url);
},

OpenPreview: function() {
	this.setPublishStatus(0);
	window.open('spreads.html','Spreads', 'menubar=yes, location=no, resizable=yes, scrollbars=yes, status=no');
},

OpenPublicLibrary: function() {
	this.OpenTabWith(this.TRAILS_HTTP_ROOT + '/');
	//window.open(this.TRAILS_HTTP_ROOT + '/', 'trails Public Library', 'height=600,width=800, menubar=0, location=0, resizable=1, scrollbars=1, status=0');
},

OpenScreencast: function() {
	this.OpenTabWith("http://www.vimeo.com/album/1489481");
	//window.open(this.TRAILS_HTTP_ROOT + 'help/screencast.php', 'trails Screencast', 'height=620,width=960, menubar=0, location=0, resizable=1, scrollbars=1, status=0');
},

OpenHelp: function() {
	this.OpenTabWith(this.TRAILS_HTTP_ROOT + 'help/');
	//window.open(this.TRAILS_HTTP_ROOT + 'help/', 'trails Public Library', 'height=600,width=800, menubar=0, location=0, resizable=1, scrollbars=1, status=0');
},

OpenTerms: function() {
window.open(this.TRAILS_HTTP_ROOT + 'legal/', 'trails Public Library', 'height=600,width=800, menubar=0, location=0, resizable=1, scrollbars=1, status=0');
},

OpenPDFexpHelp: function() {
window.open(this.TRAILS_HTTP_ROOT + 'help/#1.1', 'trails Online Help', 'height=600,width=800, menubar=0, location=0, resizable=1, scrollbars=1, status=0');
},

OpenAbout: function() {
	alert('trails: a project by the Café Society (www.thecafesociety.org)\n\n© All rights reserved.\nthe Café Society, 2007-2011\nver. 0.4.3')	
},

//This is a fix for the weird characters.
//If the keycode is over 255 (standard) it will switch characters
//using their unicode entity, for example &#8211; for a line.

removeShit: function(input) {

    var howLong = input.length;
    var output = "";
    
    for (var i = 0; i < howLong; i++) {
        var currCharCode = input.charCodeAt(i);

        if (currCharCode > 255) {
            output = output + "&#" + currCharCode + ";";
        }
        else {
            output = output + input.charAt(i);
        }
    }
    
    return output;
},
//End fix.

insertNativeBreaks: function(theContent) {
	return theContent.replace(/\n/g, "<br/>");
},

checkEmail: function(email) {
	if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)){
		return (true)
	}
return (false)
},

getHorizontalOverflow: function(p){
	if(p.innerHTML.length==0) return 0;
//	alert("client: " + p.id + "\n" + "clientWidth: " + p.clientWidth + "\n" + "scrollWidth: " + p.scrollWidth + "\n" + "ratio: " + p.clientWidth/p.scrollWidth);
	return p.clientWidth/p.scrollWidth;
},


//Is actually making the article have no content and no reference or separator.
removeArticleShort: function(aid,pid,img) {  
	var answer = confirm ("Are you sure you want to remove the Article?");
	var OS = this.fetchOS();
	var deep_path = this.ext().path;
	var theImage = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);

	if(answer) {
        article = aid;
        page = pid;
	
		try {
			var mDBConn = this.openDB();
//			mDBConn.executeSimpleSQL("UPDATE Articles SET content = 'removed' WHERE pageID = '"+page+"' AND articleID = '"+article+"'");
			mDBConn.executeSimpleSQL("DELETE FROM Articles WHERE pageID = '"+page+"' AND articleID = '"+article+"'");
			mDBConn.executeSimpleSQL("DELETE FROM Images WHERE pId = '"+page+"' AND aId = '"+article+"'");
			mDBConn.executeSimpleSQL("UPDATE Articles SET articleID = articleID - 1 WHERE pageID = '"+page+"' AND articleID > '" + article + "'");
			mDBConn.executeSimpleSQL("UPDATE Images SET aId = aId - 1 WHERE pId = '"+page+"' AND aId > '" + article + "'");
			
			this.updatePreview('child');
			
			//Updates sidebar from preview window. (Mikael, 25 Mar 2010)
			this.updatePreview('browser');

		} catch (e) {
		    alert("SQL error (removeArticleShort): " + e);
		}
		
		if(img) {
			try {
				var imagePath;
				if (OS == 'win') {
					var imagePath = deep_path + '\\chrome\\content\\' + img;
				} else {
					var imagePath = deep_path + '/chrome/content/' + img;
				}
				theImage.initWithPath(imagePath);
				
				if(theImage.exists()) {
					theImage.remove(false);
				}
			} catch (e) {
				alert(e);
			}
		}
	}
},

previewPage: function(pageNumber) {
	try {
        var mDBConn = this.openDB();
        mDBConn.executeSimpleSQL("UPDATE Settings SET currentPage = '" + pageNumber + "'");
		
		//When preview comes up, don't pop print/export dialogs.        
        this.setPublishStatus(0);
        window.open('spreads.html','Spreads', 'menubar=yes, location=no, resizable=yes, scrollbars=yes, status=no');
    } catch (e) {
        alert("SQL error (storeArticle3): " + e);
    }
},

cancelElement: function() {
	window.close();
	return false;
},

turnTrails: function(mode) {
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
	                       .getService(Components.interfaces.nsIWindowMediator);  
	    var mainWindow = wm.getMostRecentWindow("navigator:browser");
		var sidebarElement = "";
	
		if(mainWindow.sidebar.document.getElementById('file-menu')) {
			sidebarElement = mainWindow.sidebar;
		} else if(window.document.getElementById('file-menu')) {
			sidebarElement = window;
		}
		
		var disabled = (mode == 'on')? "" : "true";
		
		this.setMenuItem(sidebarElement, 'publish-menu', disabled);
		this.setMenuItem(sidebarElement, 'new-spread', disabled);
		this.setMenuItem(sidebarElement, 'page-spread-remove', disabled);
		this.setMenuItem(sidebarElement, 'set-page-title', disabled);
		this.setMenuItem(sidebarElement, 'file-add-menu', disabled);
	
	} catch(e){alert(e)}
},

setMenuItem: function(sideBar, id, disabled) {
	try {
		if(sideBar && sideBar.document && sideBar.document.getElementById(id)) {
			sideBar.document.getElementById(id).disabled = disabled;
		}
	} catch(e){alert(e)}
}

};

window.addEventListener("load", function(e) { trails.onLoad(e); }, false);
trails.loadUpPage();

