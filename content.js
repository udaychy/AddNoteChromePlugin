chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "clicked_browser_action" ) {
      var firstHref = $("a[href^='http']").eq(0).attr("href");

      console.log(firstHref);

      // This line is new!
      chrome.runtime.sendMessage({"message": "open_new_tab", "url": firstHref});
    }
  }
);

var commentFormId = "";
//var $commentForm = "";
var currentPageComments = [];
var pageId = "";

onLoad();

function onLoad(){
	commentFormId = "comment-form-" + new Date().getTime();
	//$commentForm = 
	createCommentForm();
	pageId = setPageData();
	currentPageComments = getCurrentPageComments();
	highlightContent();
}

document.onmouseup = onTextSelection;
$(document)
	.on('click', '#' + commentFormId + ' .cancel', onCancel)
	.on('click', '#' + commentFormId + ' .add', onAdd)
	.on({
		mouseenter: onContentHoverIn,
		mouseleave: onContentHoverOut
	}, '.highlighted-content');
	

// EVENT HANDLERS
function onCancel(e){
	$('#'+ commentFormId).hide();
	$('#'+ commentFormId + ' .comment').val('');
	console.log('Cancelled');
}

function onAdd(e){
	var $commentForm = $('#'+ commentFormId);
	var $comment = $commentForm.children('.comment');
	var $content = $commentForm.children('.selected-text');
	
	var commentDataToInsert = {
		pageId: pageId,
		pageOrigin: window.location.origin, 
		contentId: $content.attr('data-id'),
		content: $.trim($content.text()),
		comment: $.trim($comment.val()),
	}
	
	var commentData = localStorage.commentData ? JSON.parse(localStorage.commentData) : {};
	if (typeof commentData[pageId.toString()] == "undefined"){
		commentData[pageId.toString()] = [commentDataToInsert]
	}else{
		commentData[pageId.toString()].push(commentDataToInsert);
	}
	
	localStorage.commentData = JSON.stringify(commentData)
	 
	$comment.val('');
	$commentForm.hide();
	currentPageComments = getCurrentPageComments();
	console.log('Comment Added');
}

function onContentHoverOut(e){
	$(".hovered-comment").remove();
}

function onContentHoverIn(e){
	var $this = $(this);
	var commentObj = getCommentObjFromContentId($this.attr('data-id'));
	if(!commentObj)return;
	
	var commentDivCss = {
		position: 'absolute',
		padding: '10px',
		top: e.currentTarget.offsetTop + e.target.offsetHeight + 'px',
		//left: e.currentTarget.offsetLeft + e.target.offsetWidth/2 - $commentDiv.width()/2 + 'px',
		maxHeight: '200px',
		height: 'auto',
		width: 'auto',
		maxWidth: '200px',
		overflowY: 'auto',
		zIndex: '9999',
		textAlign: 'center',
		borderRadius: '5px',
		background: 'white',
		color: '#777', 
		boxShadow: '0px 0px 8px 2px #ccc'
	}
	
	var div = document.createElement('DIV');
	var $commentDiv = $(div);
	
	$commentDiv.html(commentObj.comment);
	$commentDiv.css(commentDivCss)
	.addClass('hovered-comment');	
	//.attr('data-id', $this.attr('data-id'))
	var width = $commentDiv.width()/2;
	console.log( e.currentTarget.offsetLeft , e.target.offsetWidth/2, $commentDiv.width()/2)	
	$commentDiv.appendTo($this);
	$commentDiv.css("left", e.currentTarget.offsetLeft + e.target.offsetWidth/2 - $commentDiv.width()/2 + 'px')
}

function highlightContent(){
	
	/*$.each(currentPageComments, function(i, item){
		var findings = $('*:contains('+ item.content +')');
		if(findings.length > 0){
			var $targetDom = $(findings[findings.length - 1]);
			var domContent = $targetDom.html();
			$targetDom.html(domContent.replace(item.content, 
			'<span class="highlighted-content" data-id="'+ item.contentId +'">'+item.content+'</span>'));
		}
	});*/
	
	$.each(currentPageComments, function(i, item){
		//var expression = "(\>{1}[^\n\<]*?)([^\n\<]" + item.content + ")";
		var textToSearch = item.content.replace(/↵/g, "\n");
		var b = document.body;
		console.log(b.innerText.match(textToSearch))

		var expression = "(\>{1}[^\n\<]*?)([^\n\<]{0,30}" + item.content + ")";
		var p = new RegExp(expression, 'g');
		
		b.innerHTML=b.innerHTML.replace(p,'$1<span class="highlighted-content" data-id="'
		+ item.contentId +'">$2</span>');	
	});

	
	// var searchWords = textToSearch.split(/\s+/);
	// $.each(searchWords, function(i, word){
	// 	var p = new RegExp("(" + word + ")(?=[^>]*<)", 'g');
	// 	var b = document.body;
	// 	b.innerHTML=b.innerHTML.replace(p,'<span class="highlighted-content" data-id="'
	// 	+ item.contentId +'">$1</span>');	
	// })


    // foreach(string word in searchWords) {
    //     // the empty string was getting put into the array
    //     // Don't replace it.
    //     // also, let's exclude any word of 1 character
    //     if (word.Trim().Length > 1) {
    //         string pattern = "(" + word + ")(?=[^>]*<)";
    //         highlightedAnswer = Regex.Replace(highlightedAnswer, pattern,
    //             "<B style='color:black;background-color:" + HighlightColor +
    //             "'>$1</B>", RegexOptions.IgnoreCase);
    //     }
    // }

    //return highlightedAnswer;
	
}

function highlightInElement(elementId, text){
    var elementHtml = document.getElementById(elementId).innerHTML;
    var tags = [];
    var tagLocations= [];
    var htmlTagRegEx = /<{1}\/{0,1}\w+>{1}/;

    //Strip the tags from the elementHtml and keep track of them
    var htmlTag;
    while(htmlTag = elementHtml.match(htmlTagRegEx)){
        tagLocations[tagLocations.length] = elementHtml.search(htmlTagRegEx);
        tags[tags.length] = htmlTag;
        elementHtml = elementHtml.replace(htmlTag, '');
    }

    //Search for the text in the stripped html
    var textLocation = elementHtml.search(text);
    if(textLocation){
        //Add the highlight
        var highlightHTMLStart = '<span class="highlight">';
        var highlightHTMLEnd = '</span>';
        elementHtml = elementHtml.replace(text, highlightHTMLStart + text + highlightHTMLEnd);

        //plug back in the HTML tags
        var textEndLocation = textLocation + text.length;
        for(i=tagLocations.length-1; i>=0; i--){
            var location = tagLocations[i];
            if(location > textEndLocation){
                location += highlightHTMLStart.length + highlightHTMLEnd.length;
            } else if(location > textLocation){
                location += highlightHTMLStart.length;
            }
            elementHtml = elementHtml.substring(0,location) + tags[i] + elementHtml.substring(location);
        }
	}
}

    //Update the innerHTML of the element


function getCurrentPageComments(){
	if(!localStorage.pageData || !localStorage.commentData)	return [];
	
	var commentData = JSON.parse(localStorage.commentData);
	return commentData[pageId.toString()] || [];
}

function getCommentObjFromContentId(id){
	var commentArr = $.map(currentPageComments, function(item){
		if(item.contentId == id) return item
	});
	return commentArr && commentArr.length > 0 ? commentArr[0] : null;
}

function setPageData(){
	var pageDataToInsert = {
		pageUrl: window.location.href,
		pageId: new Date().getTime()
	}
	
	if(!localStorage.pageData) {
		localStorage.pageData = JSON.stringify([pageDataToInsert])
		return pageDataToInsert.pageId;	
	}
	
	var pageData = JSON.parse(localStorage.pageData);
	var currentPageData = $.map(pageData, function(item){
		if(item.pageUrl == window.location.href)
			return item;
	});
	
	if(currentPageData && currentPageData.length > 0)
		return currentPageData[0].pageId;
	
	pageData.push(pageDataToInsert);
	localStorage.pageData = JSON.stringify(pageData);
	return pageDataToInsert.pageId;	
}

function createCommentForm(){
	var template = '<div class="selected-text"></div>'
	+'<input type="hidden" class="selected-text-id">'
	+'<textarea class="comment"></textarea>'
	+'<button class="add">Add</button> <button class="cancel">Cancel</button>';
	
	var addButtonCss = {
		color: 'rgba(255,255,255,0.9)',
		backgroundColor: '#07c',
		borderColor: '#005999',
		height:'10%',
		boxShadow: 'inset 0 1px 0 #3af',
		borderRadius: '2px',
		border: '1px solid transparent',
		fontSize: '14px',
		padding: '8px 13px 8px 13px',
		lineHeight: '13px'
		
	}
	var cancelButtonCss = {
		color: 'rgba(255,255,255,0.9)',
		backgroundColor: '#999',
		borderColor: '#777',
		height:'10%',
		boxShadow: 'inset 0 1px 0 #ccc',
		borderRadius: '2px',
		border: '1px solid transparent',
		fontSize: '14px',
		padding: '8px 13px 8px 13px',
		lineHeight: '13px'
	}
	var commentDivCss = {
		position: 'fixed',
		right: '0px',
		top: '20%',
		width: '30%',
		height: '50%',
		padding: '10px',
		minHeight: '200px',
		minWidth: '200px',
		zIndex: '9999',
		background: 'white',
		color: '#777', 
		boxShadow: '0px 0px 8px 2px #ccc',
		display:'none'
	}
	var selectedTextCss = {
		boxShadow: '0px 0px 1px #ccc',
		lineHeight: '28px',
		fontSize: '13px',
		padding: '2px 15px',
		color: '#333',
		height: '15%',
		overflowY : 'auto'
	}
	var commentAreaCss = {
		width: '100%',
		marginTop: '10px',
		height: 'calc(75% - 20px)'
	}
	
	var div = document.createElement('DIV');
	var $commentDiv = $(div);
	$commentDiv.html(template);
	$commentDiv.attr("id", commentFormId);
	$commentDiv.css(commentDivCss);	
	$commentDiv.children(".selected-text").css(selectedTextCss);
	$commentDiv.children(".comment").css(commentAreaCss);
	$commentDiv.children(".add").css(addButtonCss);
	$commentDiv.children(".cancel").css(cancelButtonCss);
	
	$commentDiv.appendTo("body");
	return $commentDiv;
}

function displayCommentForm(selectedText, selectedTextId, comment){
	//$commentForm.css('display', 'block');
	var $commentForm = $('#'+ commentFormId);
	$commentForm.show();
	//$commentForm.children(".selected-text").
	$commentForm.children(".selected-text").attr('data-id', selectedTextId).text(selectedText);
	$commentForm.children(".comment").val(comment);
}

function addCss($element){
	if(!$element) return;
	
	$element.css({
		background: 'yellow',
		color: '#777'
	});
}

function addTags(range){
	if(!$.trim(range.cloneContents().textContent)) return;
	
	var content = range.extractContents();
    var span = document.createElement('i');
	span.appendChild(content);
	var dataId = "content-" + new Date().getTime();
	var $span = $(span);
	
	$span.attr("data-id", dataId).addClass('highlighted-content');
	range.insertNode(span);
	
	console.log(content.textContent);
	return $span;
}

function onTextSelection(e) {
	var range = window.getSelection().getRangeAt(0);
	var selectedText = $.trim(range.cloneContents().textContent);
	if(!selectedText) return;
	
	
	var $selectedElement = addTags(range);
	//addCss($selectedElement);
	displayCommentForm(selectedText, $selectedElement.attr('data-id'));
}


