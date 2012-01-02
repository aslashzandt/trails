$(document).ready(function(){

//check for FF2 for the font size shitz
	if($.browser.mozilla && $.browser.version.indexOf('1.8') > -1) {
		$("p, h2, td").addClass('ff2');
	}
//

//disable edit when clicking reference URL
	$(".articleList li a").click(function(){
		trails.OpenTabWith($(this).attr('href'));
		return false;
	});
//

//If this is the big preview, open links in that window.
    var tt = $("TrailsType").attr('type');
    if (tt == 'FULL') {
        $("a").attr('target', '_self');
    }

//hover effect - article/page title
	$(".A4Landscape ul li, .pageTitle").mouseenter(function(){
		$(this).css('background-color','#EEEEEE');
	});
	
	$(".A4Landscape ul li, .pageTitle").mouseleave(function(){
		$(this).css('background-color','');
	});
//

//add page title
	$(".pageTitle").click(function(){
		var page_number = $(this).attr("id");
		trails.setPageTitle(page_number);
	});
//

//remove article
	$(".A4Landscape ul li").mouseenter(function(){
		$(this).children(".removeArticle").show();
	});
	
	$(".A4Landscape ul li").mouseleave(function(){
		$(this).children(".removeArticle").hide();
	});
	
	$(".removeArticle").click(function(){
		$this = $(this);
		var pageID = $this.closest(".A4Landscape").attr('id').substring(4);
		var articleID = $this.parent().attr('id');
		if($this.parent().children("img")) {
			var img_path = $this.parent().children("img").attr("src")
			trails.removeArticleShort(articleID, pageID, img_path);
		} else {
			trails.removeArticleShort(articleID, pageID);
		}
		return false;
	});
//
	
	$(".edit img").hover(function(){
		this.src = this.src.replace("_grey","_hover");
	}, function(){
		this.src = this.src.replace("_hover","_grey");
	});

//add page
	$(".addPageArea").mouseenter(function(){
		$(this).children(".addPage").show();
	});
	
	$(".addPageArea").mouseleave(function(){
		$(this).children(".addPage").hide();
	});
	
	$(".addPage").click(function(){
		$this = $(this);
		var pageID = $this.closest(".A4Landscape").attr('id').substring(4);
		var columns = $this.attr("id");
//		alert("page: " + pageID + "\ncolumns: " + columns)
		trails.addPageAfter(pageID, columns);
		trails.updatePreview('child');
	});
//
	
//hover page
	$(".A4Landscape").mouseenter(function(){
		$this = $(this);
		$this.children(".removePage").show();
		$this.children(".previewPage").show();
		$this.children(".pageNumber").show();
	});
	
	$(".A4Landscape").mouseleave(function(){
		$this = $(this);
		$this.children(".removePage").hide();
		$this.children(".previewPage").hide();
		$this.children(".pageNumber").hide();
	});
//

//remove page	
	$(".removePage").click(function(){
		var pageID = $(this).closest(".A4Landscape").attr('id').substring(4);
		trails.removePage(pageID);
	});
//

//preview page	
	$(".previewPage").click(function(){
		var pageID = $(this).closest(".A4Landscape").attr('id').substring(4);
		trails.previewPage(pageID);
	});
//

//open edit article
	$(".articleList li.text").click(function(){
		$this = $(this);
		var articleId = $this.attr('id');
		var spreadId = parseInt($this.closest(".A4Landscape").attr('id').replace("page",""));
		trails.editArticle(articleId,spreadId);
	});
	
	
	
//and blocking the p onclick
	$(".articleList p").click(function(){
		return false;
	});
//
	
});