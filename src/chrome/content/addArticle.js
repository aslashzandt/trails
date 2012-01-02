//addElement.js

var trails_addarticle = {

pageNumber: "",
pageLayout: "",
currentArticle: "",
currentFormatting: "",
currentPage: "",
formatting: "",
isReference: "",

Init: function() {

//window.onLoad = alert(window.opener.document.getElementById('sidebar').contentWindow.document.getElementById('sbEmptySidebar').childNodes[1].lastChild.id);

try {

    var mDBConn = trails.openDB();
    var getStatement = mDBConn.createStatement("SELECT currentArticle, currentFormatting, currentPage FROM Settings");


    while (getStatement.executeStep()) {
        this.currentArticle = unescape(getStatement.getUTF8String(0));
        this.currentFormatting = getStatement.getUTF8String(1);
        this.currentPage = getStatement.getInt32(2);
    }
 }
catch (e) {
    alert("SQL error (Init): " + e);
}

    var articleField = document.getElementById("article");
    articleField.value = this.currentArticle;

//	Get the formatting to decide if there will be LIGHT and BOLD choises. Not supposed to be there for title!
	this.formatting = this.currentFormatting;

	var light = document.getElementById("light");
	var bold = document.getElementById("bold");
	var separator = document.getElementById("separator");
	var reference = document.getElementById("reference");
	
	if (this.formatting == 'title') { bold.disabled = true; light.disabled = true; separator.disabled = true; reference.disabled = true;}

	//
	//Fills the pagesList menupopup with available pages.
	var pagesList = document.getElementById("pagesList");
	var totalPages = trails.fetchPageCount();
	
	for(var i = 1; i <= totalPages; i++) {
	pagesList.appendItem(i, i);
	}
	
	//Fetch the last used page and select it:
	var cSelected = this.currentPage;
	
	if(cSelected == '') {cSelected = 1; }
	if(cSelected > totalPages) {cSelected = 1;}
	
	pagesList.selectedIndex = cSelected - 1;
	
	//Just won't work from here...
	//document.getElementById('saveButton').focus();
},

//This is the function that saves the article when it's created initially.
//Asking for the pagenumber and making sure it's beeing in the function
//that allows to edit it.

saveArticle: function() {

	var articleField = document.getElementById("article");
	
	//Get and write the pagenumber.
	var pList = document.getElementById('pagesList');
	this.pageNumber = pList.selectedIndex + 1;
	if (articleField.value != '') {
		
		try {
		    var mDBConn = trails.openDB();
		    mDBConn.executeSimpleSQL("UPDATE Settings SET currentPage = '" + this.pageNumber + "'");
		}
		catch (e) {
		    alert("SQL error (saveArticle): " + e);
		}
		
		//Get the formatting
		try {
		
		    var mDBConn = trails.openDB();
		    var getStatement = mDBConn.createStatement("SELECT currentReference, currentFormatting FROM Settings");
		
		    var currentMetaTags;
		
		    while (getStatement.executeStep()) {
				currentMetaTags = getStatement.getUTF8String(0);
		        this.currentFormatting = getStatement.getUTF8String(1);
		    }
		}
		catch (e) {
		    alert("SQL error (saveArticle2): " + e);
		}
		
		this.formatting = this.currentFormatting;
		
//		alert(formatting);
		
		var light = document.getElementById("light");
		//Reads the radiobuttons and makes that the formatting for the article.
		if(this.formatting == "text") {
		//If the light radio is selected it's light, if not then it's bold.
			if(light.selected == true) {
				this.formatting = "light";
			} else {
				this.formatting = "bold";
			}
		//If it's not text it must be a title.  
		} else {
			this.formatting = "title";
		}
		
		this.currentArticle = trails.fetchArticleCount(this.pageNumber) + 1;
		
		//Fetch the reference and separator checkbox statuses.
		var reference = document.getElementById("reference");
		this.isReference = reference.selected;
		
		if(this.formatting == "title") {
			this.isReference = false;
		}
		
// HERE WE START TESTING IF THE ARTICLE FITS

		try {

			var theSideBar = window.opener.document.getElementById('sidebar');
			var page = '';
	
			if(theSideBar != null) {
	
				if(theSideBar.contentWindow.document.getElementById('browserTable')) {
					page = theSideBar.contentWindow.document.getElementById('browserTable').contentWindow.document.getElementById("page" + this.pageNumber).getElementsByTagName('DIV')[0];
				} else {
					trails.toggleSidebar('viewEmptySidebar');
				}
				
			} else {
				page = window.opener.window.document.getElementById('browserTable').contentWindow.document.getElementById("page" + this.pageNumber).getElementsByTagName('DIV')[0];
			}
			
		} catch(e) {
			alert(e);
		}
		
		try {
		    var mDBConn = trails.openDB();
		    var getStatement = mDBConn.createStatement("SELECT columns FROM Pages WHERE pageID = '"+ this.pageNumber +"'");
		
		    while (getStatement.executeStep()) {
		        this.pageLayout = getStatement.getInt32(0);
			}
		} catch (e) {
		    alert("SQL error (get columns for dummy): " + e);
		}
		
		if (this.formatting == "light") { var styletag = '<p class="light' + this.pageLayout + '">'; }
		if (this.formatting == "bold") { var styletag = '<p class="bold' + this.pageLayout + '">'; }
		if (this.formatting == "title") { var styletag = '<h2 class="lay' + this.pageLayout + '">'; }
		
		var dummyArticle = '<li>';
		
		if(this.isReference == true) {
//			alert("TRUE" + currentMetaTags);
			dummyArticle = dummyArticle + currentMetaTags;
		} else {
//			alert("FALSE" + currentMetaTags);
			dummyArticle = dummyArticle + ('<hr class="hr1" />');
		}
		
		articleField.value = unescape(articleField.value);
		
		if (this.formatting == "special") { dummyArticle = dummyArticle + styletag + articleField.value + '</p>'; }
		if (this.formatting == "light") { dummyArticle = dummyArticle + styletag + articleField.value + '</p>'; }
		if (this.formatting == "bold") { dummyArticle = dummyArticle + styletag + articleField.value + '</p>'; }
		
		if(this.formatting == "title") {
			dummyArticle = dummyArticle + '<div class="title' + this.pageLayout + '">';
			var theTitleUpper = articleField.value;
//			alert(theTitleUpper);
			dummyArticle = dummyArticle + styletag + theTitleUpper + '</h2></div><hr class="hr1" />';
		}
		
		dummyArticle = dummyArticle + '</li>';
		
//		alert(dummyArticle);
		
		var spread = page.getElementsByTagName('DIV')[0].getElementsByTagName("ul")[0];
		spread.innerHTML += trails.insertNativeBreaks(dummyArticle);
		
		this.getImgHeight();
	
	} else {
		alert('Article must contain text!');
	}
},

checkAndStoreIfValid: function(page) {
	
	if(trails.getHorizontalOverflow(page)<1) {
//			window.open('chrome://trails/content/addPage.xul','Add Page', 'height=375,width=608 menubar=no, location=no, modal=yes, resizable=no, scrollbars=no, status=no');
		if(window.opener.document.getElementById('sidebar')) {
			var theSidebar = window.opener.document.getElementById('sidebar').contentWindow.document.getElementById('browserTable').contentWindow.location.reload();;
		} else {
			var theSidebar = window.opener.window.location.reload();;
		}
		var answer = confirm("Article doesn't fit.\nA new spread will be inserted, and the article will be added to it.\n\nIf you'd rather insert the article somewhere else, cancel this dialogue and choose another insert spread.");
		if(answer) {
			trails.addPageAfter(this.pageNumber, this.pageLayout);
			this.pageNumber = this.pageNumber + 1;
		} else {
			return false;
		}
	}
	
// HERE WE END TESTING IF THE ARTICLE FITS
	var articleField = document.getElementById("article");
	
	trails.storeArticle(articleField.value, this.currentArticle, this.pageNumber, this.formatting, this.isReference, this.pageLayout);
	
	//anthon edit
	//anthon edit
//		window.opener.document.getElementById('sidebar').contentWindow.location.reload();
	//end anthon edit//end anthon edit
	
	window.close();
	
	trails.updatePreview('browser');

},

getImgHeight: function() {
		
	var heightTimer;
	var page = "";
	
	if(window.opener.document.getElementById('sidebar')) {
	page = window.opener.document.getElementById('sidebar').contentWindow.document.getElementById('browserTable').contentWindow.document.getElementById("page" + this.pageNumber).getElementsByTagName('DIV')[0];
	} else {
	page = window.opener.window.document.getElementById('browserTable').contentWindow.document.getElementById("page" + this.pageNumber).getElementsByTagName('DIV')[0];
	}
	
	var spread = page.getElementsByTagName('DIV')[0].getElementsByTagName("ul")[0];
	
	if(spread.getElementsByTagName("img").length > 0) {
		var imgs = spread.getElementsByTagName("img");
					
		if(imgs[imgs.length-1].height > 0) {
//					alert("yay!" + imgs[imgs.length-1].height);
			this.checkAndStoreIfValid(page);
		} else {
//					alert("nay!" + imgs[imgs.length-1].height);
			heightTimer = setTimeout("trails_addarticle.getImgHeight()", 100);
		}
	} else {
		this.checkAndStoreIfValid(page);
	}
},
	
cancelArticle: function() {
	window.close();
}

};