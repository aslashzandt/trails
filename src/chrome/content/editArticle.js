//editArcticle.js

//This function is the edit function. We have the article and page numbers of the article from when it was created.
//It's used when the article is made and a user clicks the text.

//setting the current page and article

var trails_editarticle = {

article: "",
page: "",

Init: function() {

	try {	
		var mDBConn = trails.openDB();
		var getStatement = mDBConn.createStatement("SELECT currentArticle, currentPage FROM Settings");

		while (getStatement.executeStep()) {
			this.article = getStatement.getInt32(0);
			this.page = getStatement.getInt32(1);
		}
	} catch (e) {
		alert("SQL error (Init): " + e);
	}

	
	try {
	    var mDBConn = trails.openDB();
	    var getStatement = mDBConn.createStatement("SELECT reftype, textstyle, content FROM Articles WHERE pageID = '"+this.page+"' AND articleID = '"+this.article+"'");
	
	    var reftype, textstyle, content;
	
	    while (getStatement.executeStep()) {
	        reftype = getStatement.getUTF8String(0);
	        textstyle = getStatement.getUTF8String(1);
	        content = getStatement.getUTF8String(2);
	    }
	} catch (e) {
	    alert("SQL error (Init2): " + e);
	}
	
	//Unescape the content for display in textbox
	content = unescape(content);
	
	
	//Fill the article field with the content we need to edit.
	var articleField = document.getElementById("article");
	articleField.value = content;
	
	
	//Read up ini to get the states of the separator and reference.
		
	//Fetch the radiobutton group and set the selected element acording to the reference true/false.
	var editRadio = document.getElementById("editRadio");
	if (reftype == 'true') { editRadio.selectedIndex = 0; } else { editRadio.selectedIndex = 1; }
	
	var editStyle = document.getElementById("fontStyle");
	if (textstyle == 'light') { editStyle.selectedIndex = 0; } else { editStyle.selectedIndex = 1; }
	
	//Get the formatting to decide if there will be LIGHT and BOLD choises. Not supposed to be there for title!
	//Added also the other options since the subtitles are not gonna have any options at all.
	
	
	var light = document.getElementById("light");
	var bold = document.getElementById("bold");
	var separator = document.getElementById("separator");
	var reference = document.getElementById("reference");

	//if (textstyle == 'title' || (formatting && formatting == 'special')) { bold.disabled = true; light.disabled = true; separator.disabled = true; reference.disabled = true; }
	if (textstyle == 'title') { bold.disabled = true; light.disabled = true; separator.disabled = true; reference.disabled = true; }
},

saveEditedArticle: function() {
	
	//Get the layout since we need to apply different classes to the paragraphs depending on the layout.
    try {
        var mDBConn = trails.openDB();
        var getStatement = mDBConn.createStatement("SELECT columns FROM Pages WHERE pageid = '" + this.page + "'");

        var pageLayout;

        while (getStatement.executeStep()) {
            pageLayout = getStatement.getInt32(0);
        }
    } catch (e) {
        alert("SQL error (saveEditedArticle3): " + e);
    }
    
    try {
	
        var mDBConn = trails.openDB();
        var getStatement = mDBConn.createStatement("SELECT reftype, textstyle, content FROM Articles WHERE pageID = '" + this.page + "' AND articleID = '" + this.article + "'");

        var reftype, textstyle, content;

        while (getStatement.executeStep()) {
            reftype = getStatement.getUTF8String(0);
            textstyle = getStatement.getUTF8String(1);
            content = getStatement.getUTF8String(2);
        }
    } catch (e) {
        alert("SQL error (saveEditedArticle2): " + e);
    }

    var articleField = document.getElementById("article");
    
    //Just write the updated formatting if this is text, not title.
    if (textstyle != 'title' && textstyle != 'special') {
        var light = document.getElementById("light");
        if (light.selected == true) { textstyle = 'light'; } else { textstyle = 'bold'; }
    }
    
    var dummyArticle = '<div class="reference">SOURCE<br/>TIME</div><p class="';
    
    if($.browser.mozilla && $.browser.version.indexOf('1.8') > -1) { dummyArticle += 'ff2 '; }
	if (textstyle == "light") { dummyArticle += 'light' + pageLayout; }
	if (textstyle == "bold") { dummyArticle += 'bold' + pageLayout; }
	dummyArticle += '">' + articleField.value + '</p>';
	
//	alert("page: " + page + "\narticle: " + article);
	
	//Get and write the pagenumber.
	var p = window.opener.window.document.getElementById("page" + this.page).getElementsByTagName('DIV')[0];
//	alert($(p).children("div:first").children("ul").children("#"+article).attr('id'));
	$(p).children("div:first").children("ul").children("#"+this.article).html(dummyArticle);
//	p.getElementsByTagName('ul')[0].getElementById(article+'').getElementsByTagName('p')[0].innerHTML = dummyArticle;
//	alert(dummyArticle);
    if (articleField.value != '') {
    
    	if(trails.getHorizontalOverflow(p)<1) {
	
			alert("Your edited is too long for the current spread.\nPlease break it up into several articles.");
			
			trails.updatePreview('trails');
			
		} else {
	
	/*		try {
	
	            var mDBConn = openDB();
	            var getStatement = mDBConn.createStatement("SELECT currentArticle, currentPage FROM Settings");
	
	            var article, page;
	
	            while (getStatement.executeStep()) {
	                article = getStatement.getInt32(0);
	                page = getStatement.getInt32(1);
	            }
	        } catch (e) {
	            alert("SQL error (saveEditedArticle): " + e);
	        }
	*/
	
	        //Read the reference, and set true in the ini if it's selected.
	        var reference = document.getElementById("reference");
	
	        if (reftype != 'none') {
	            reftype = reference.selected;
	        }
	
	        if (textstyle == "light") { var fString = '<p class="light' + pageLayout + '" onclick="trails.editArticle('; }
	        if (textstyle == "bold") { var fString = '<p class="bold' + pageLayout + '" onclick="trails.editArticle('; }
	        if (textstyle == "title") { var fString = '<h2 class="lay' + pageLayout + '" onclick="trails.editArticle('; }
	        if (textstyle == "special") { var fString = '<p class="light2" onclick="trails.editArticle('; }
	
	        //Escape the content for storage
	        var theContent = articleField.value;
	        theContent = escape(theContent);
	
	        try {
	            var mDBConn = trails.openDB();
	            mDBConn.executeSimpleSQL("UPDATE Articles SET content = '" + theContent + "', edittag = '" + fString + "', reftype = '" + reftype + "', textstyle = '" + textstyle + "' WHERE pageID = '" + this.page + "' AND articleID = '" + this.article + "'");
	            
                trails.updatePreview('previewEdit');
                
	            trails.updatePreview('trails');
	
	        } catch (e) {
	            alert("SQL error (saveEditedArticle4): " + e);
	        }
	
	        window.close();
		}
			
    } else {
    	alert('Article must contain text!');
    }
},

//Is actually making the article have no content and no reference or separator.
removeArticle: function() {  
	var answer = confirm ("Are you sure you want to remove the Article?")

	if (answer) {

/*		try {
		    var mDBConn = openDB();
		    var getStatement = mDBConn.createStatement("SELECT currentArticle, currentPage FROM Settings");
		
		    var article, page;
		
		    while (getStatement.executeStep()) {
		        article = getStatement.getInt32(0);
		        page = getStatement.getInt32(1);
		    }
		} catch (e) {
		    alert("SQL error (removeArticle): " + e);
		}
*/	
		try {
			var mDBConn = trails.openDB();
//			mDBConn.executeSimpleSQL("UPDATE Articles SET content = 'removed' WHERE pageID = '"+page+"' AND articleID = '"+article+"'");
			mDBConn.executeSimpleSQL("DELETE FROM Articles WHERE pageID = '"+this.page+"' AND articleID = '"+this.article+"'");

			trails.updatePreview('trails');
		} catch (e) {
		    alert("SQL error (removeArticle2): " + e);
		}
        
        trails.updatePreview('previewEdit');
	
		window.close();
	}
	
//	window.opener.window.location.reload(true);
},
cancelArticle: function() {
	window.close();
}

};