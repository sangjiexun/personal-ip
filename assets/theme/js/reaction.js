(function($){
	'use strict';

	window.init_reaction = function(){
		$('.post-reactions').each(function(_index, _item){
			$(_item).find('a.emoji-item').on('click', function(){
				
				$(_item).find('.post-action-react').hide();

	        	$.post(theme_options.ajax_url, { action: 'themeton_post_reaction', post_id:$(_item).data('post-id'), reaction:$(this).data('emoji') }, function(data){
	        		if( data!='' ){
	        			var _response = false;
	        			try{
	        				_response = $.parseJSON(data);
	        			}catch(e){}

	        			if( _response ){

	        				var _total = 0,
	        					_reactions = '';
	        				$.each(_response, function(_i, _emo){
	        					_total += parseInt(_emo.count, 10);
	        					_reactions += '<span> \
													<svg class="emotion-icon emoji-icon-'+_emo.emoji+'" aria-hidden="true"> \
														<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#emoji-icon-'+_emo.emoji+'"></use> \
													</svg> \
												</span>';
	        				});

	        				$(_item).find('>span').remove();
	        				$(_item).find('>em').text(_total);
	        				$(_item).find('>em').before(_reactions);
	        			}
	        		}
	        	});

			});
			
			var _post_id = parseInt($(_item).data('post-id'), 10);
			if( themeton_reaction_of_posts.indexOf(_post_id) > -1 ){
				$(_item).find('.post-action-react').hide();
			}
		});
	};

	$(document).ready(function(){

		window.init_reaction();

	});

}(jQuery));