function translate_string(eng)
{
	eng = eng.toString();
	
	if(eng.length == 0)
		return '';

	var eng_lower = eng.toLowerCase();

	if(typeof(theLangStrings) != 'undefined' && typeof(theLangStrings[eng_lower]) != 'undefined')
		return theLangStrings[eng_lower];
	
	return eng;
}

// translate all childs with lang class for DOM => translate_obj($('body')),  translate_obj($('#member-table'))
function translate_obj(object)
{
	if (typeof(object) !== 'object')
		return '';

	$(object.selector + ' .lang').each(function(index, obj) {

		// translate inner html
		if ($(this).children().length == 0) {
			var eng = $(this).html().trim();
			if (eng.length > 0) {
				$(this).html(translate_string(eng));
			}
		}

		// translate title
		if ($(this).attr('title')) {
			var eng = $(this).attr('title').trim();
			if (eng.length > 0)
				$(this).attr('title', translate_string(eng));
		}

		// translate placeholder
		if ($(this).attr('placeholder')) {
			var eng = $(this).attr('placeholder').trim();
			if (eng.length > 0)
				$(this).attr('placeholder', translate_string(eng));
		}

		// translate value
		if ($(this).is('input') && ($(this).attr('type') == 'button' || $(this).attr('type') == 'submit')) {
			var eng = $(this).attr('value').trim();
			if (eng.length > 0)
				$(this).attr('value', translate_string(eng));
		}

	});
}
