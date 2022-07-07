const MEMBER_GROUP_DEFAULT	= 0;
const MEMBER_GROUP_GUEST	= -1;
const MEMBER_GROUP_PREPAID	= -2;
const MEMBER_GROUP_POSTPAID	= -3;
const MEMBER_GROUP_OFFER	= -4;
const MEMBER_GROUP_FREE 	= -5;
var thePCStatus = { member_account: ''};
var theLockScreenPassword = '';
var theWssLogined = false;
var theClientStatusInitialized = false; // when first wss connected, received client_status package from idc.
var theLastWindowSize = '';
var theMonitorTurnOffStartTime = 0;
var theIsHomeVersion = false;

// times
var theIdleMonitorTimerId = null;
var theIdleMiningTimerId = null;
var theCountDownIntervalId = null;
var theQueryRunGameIdsIntervalId = null;
var theMonitorTurnOffIntervalId = null;
var theTimeWarnJobs = [];
var theAvailableOffers = [];
var theGameTrackerInterval = null;

var theTax = null;
var theShop = null;
var theGameList = null;
var theEvents = null;

// avoid multiple submit
var _timer = {};
function delay_execute(fn) {
	if (_timer[fn]) {
		window.clearTimeout(_timer[fn]);
		delete _timer[fn];
	}

	_timer[fn] = window.setTimeout(function() {
		fn();
		delete _timer[fn];
	}, 300);

	return false;
}


///////////////////////////////////// share functions  ////////////////////////////////////////////
function format_time(seconds)
{
	var hours = parseInt(seconds / 3600);
	var mins = parseInt((seconds % 3600) / 60);
	var secs = seconds % 60;
	var days = parseInt(hours / 24);

	var message = hours.toString() + ":" + mins.zeroPad(10) + ":" + secs.zeroPad(10);
	if (days > 0) {
		hours = hours % 24;
		message = days.toString() + ":" + hours.zeroPad(10) + ":" + mins.zeroPad(10) + ":" + secs.zeroPad(10);
	}
	return message;
}

function sha256(ascii)
{
	function rightRotate(value, amount) {
		return (value >>> amount) | (value << (32 - amount));
	};

	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = 'length'
	var i, j;
	var result = ''

	var words = [];
	var asciiBitLength = ascii[lengthProperty] * 8;

	var hash = sha256.h = sha256.h || [];
	var k = sha256.k = sha256.k || [];
	var primeCounter = k[lengthProperty];

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
			k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
		}
	}

	ascii += '\x80'
	while (ascii[lengthProperty] % 64 - 56) ascii += '\x00'
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j >> 8) return;
		words[i >> 2] |= j << ((3 - i) % 4) * 8;
	}
	words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
	words[words[lengthProperty]] = (asciiBitLength)

	for (j = 0; j < words[lengthProperty];) {
		var w = words.slice(j, j += 16);
		var oldHash = hash;
		hash = hash.slice(0, 8);

		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			var w15 = w[i - 15], w2 = w[i - 2];

			var a = hash[0], e = hash[4];
			var temp1 = hash[7]
				+ (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
				+ ((e & hash[5]) ^ ((~e) & hash[6]))
				+ k[i]
				+ (w[i] = (i < 16) ? w[i] : (
						w[i - 16]
						+ (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
						+ w[i - 7]
						+ (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
					) | 0
				);
			var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
				+ ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

			hash = [(temp1 + temp2) | 0].concat(hash);
			hash[4] = (hash[4] + temp1) | 0;
		}

		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i]) | 0;
		}
	}

	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i] >> (j * 8)) & 255;
			result += ((b < 16) ? 0 : '') + b.toString(16);
		}
	}
	return result;
}

function Tax()
{
	this.tax = {
		tax1_name: theSettings.tax1_name,
		tax1_percentage: theSettings.tax1_percentage,
		tax2_name: theSettings.tax2_name,
		tax2_percentage: theSettings.tax2_percentage,
		tax3_name: theSettings.tax3_name,
		tax3_percentage: theSettings.tax3_percentage,
		tax_included_in_price: theSettings.tax_included_in_price,
	};
	var that = this;

	// get sale price with tax
	this.getPriceWithTax = function(product_tax_id, price) {
		price = parseFloat(price);
		if (that.tax.tax_included_in_price == 1)
			return price.toFixed(2).replace('.00', '');

		var tax_percentage = 0;
		if (product_tax_id == 1)
			tax_percentage = that.tax.tax1_percentage / 100.0;
		if (product_tax_id == 2)
			tax_percentage = that.tax.tax2_percentage / 100.0;
		if (product_tax_id == 3)
			tax_percentage = that.tax.tax3_percentage / 100.0;

		if (tax_percentage <= 0)
			return price.toFixed(2).replace('.00', '');

		return (price * (1 + tax_percentage)).toFixed(2).replace('.00', '');
	}

	// get tax by price
	this.getTaxWithPrice = function(product_tax_id, price) {
		price = parseFloat(price);
		var tax_percentage = 0;
		if (product_tax_id == 1)
			tax_percentage = that.tax.tax1_percentage / 100.0;
		if (product_tax_id == 2)
			tax_percentage = that.tax.tax2_percentage / 100.0;
		if (product_tax_id == 3)
			tax_percentage = that.tax.tax3_percentage / 100.0;

		if (tax_percentage <= 0)
			return 0;

		// if price include tax
		if (that.tax.tax_included_in_price == 1)
			return (price / ( 1 + tax_percentage) * tax_percentage).toFixed(2);

		return (price * tax_percentage).toFixed(2);
	}
}

function is_logined()
{
	return typeof(thePCStatus.member_account) != 'undefined' && thePCStatus.member_account != null && thePCStatus.member_account.length > 0;
}


function is_member_logined()
{
	return is_logined() && thePCStatus.member_group_id >  MEMBER_GROUP_GUEST;
}


function is_locked()
{
	return ($('#page_lock').css('display') != 'none');
}


function toast(message, level)
{
	var toast_level = (typeof(level) == 'undefined' ? 'info' : level);
	var timeout = 5000;
	var extendedTimeOut = 1000;

	if (toast_level == 'warning') {
		timeout = 30000;
		extendedTimeOut = 10000;
	}

	toastr.options = {
		"closeButton": true,
		"debug": false,
		"newestOnTop": true,
		"progressBar": false,
		"positionClass": "toast-top-right",
		"preventDuplicates": false,
		"showDuration": "300",
		"hideDuration": "1000",
		"timeOut": timeout,
		"extendedTimeOut": extendedTimeOut,
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut",
		"tapToDismiss": true
	};
	toastr[toast_level](message);
}


function countdown_stop()
{
	if (theCountDownIntervalId != null) {
		clearInterval(theCountDownIntervalId);
		theCountDownIntervalId = null;
	}
	theTimeWarnJobs = [];
}


function countdown_start()
{
	if(theSettings.license_using_billing == 0)
		return false;

	if (!is_logined())
		return false;

	countdown_stop();
	theCountDownIntervalId = setInterval(countdown, 1000);

	return true;
}


function stop_login_timers()
{
	if (theIdleMonitorTimerId != null) {
		clearTimeout(theIdleMonitorTimerId);
		theIdleMonitorTimerId = null;
	}

	if (theIdleMiningTimerId != null) {
		clearTimeout(theIdleMiningTimerId);
		theIdleMiningTimerId = null;
	}

	if (theMonitorTurnOffIntervalId != null) {
		clearInterval(theMonitorTurnOffIntervalId);
		theMonitorTurnOffIntervalId = null;
	}
}

function stop_game_timers()
{
	if (theQueryRunGameIdsIntervalId != null) {
		clearInterval(theQueryRunGameIdsIntervalId);
		theQueryRunGameIdsIntervalId = null;
	}

	if (theGameTrackerInterval != null) {
		clearInterval(theGameTrackerInterval);
		theGameTrackerInterval = null;
	}

	countdown_stop();
}

function unlock_all()
{
	CallFunction("UNLOCK 65535");
	CallFunction("DISABLEBSOD");
}

///////////////////////////////////// form submit ////////////////////////////////////////////

function homecafeid_form_submit()
{
	$('#spinner').show();
	$('#loginForm button[type="submit"]').prop('disabled', true);
	CallFunction('HOMESETCAFEID ' + $('#homecafeidForm input[name=icafe_id]').val());
}

function login_form_submit()
{
	var strUserName = $('#loginForm input[name=username]').val();
	var strPassword = $('#loginForm input[name=password]').val();

	if (strUserName.length == 0 || strPassword.length == 0)
		return;

	// If home version, usename is pc
	if (theIsHomeVersion) {
		$('#spinner').show();

		var data = { username: strUserName, password: strPassword };
		CallFunction("WSSSTART " + JSON.stringify(data));
		return;
	}

	$('#loginForm button[type="submit"]').prop('disabled', true);
	$('#loginForm input[name=username]').prop('disabled', true);
	$('#loginForm input[name=password]').prop('disabled', true);

	var cmd = {
		action: 'member_login',
		version: 2,
		type: 'request',
		from: 'client',
		target: 'wss-server',
		data: {
			username: strUserName,
			passwordmd5: md5(strPassword)
		}
	};

	CallFunction('WSSSEND ' + JSON.stringify(cmd));

	$('#loginForm button[type="submit"]').prop('disabled', false);
	return false;
}

function show_member_register()
{
	$('#registerForm input[name=username]').val($('#loginForm input[name=username]').val());
	$('#registerForm input[name=password]').val($('#loginForm input[name=password]').val());
	show_login_page('member_register');
}

function guest_login()
{
	CallFunction('WSSSEND ' + JSON.stringify({ action: 'member_register', version: 2, type: 'request', from: 'client', target: 'wss-server', data: {} }));
}

function member_register_form_submit()
{
	$('#registerForm button[type="submit"]').prop('disabled', true);

	var member_account = $('#registerForm input[name=username]').val();
	var member_password = $('#registerForm input[name=password]').val();
	var confirm_password = $('#registerForm input[name=confirm_password]').val();

	if (member_account.length == 0)
		throw translate_string("Account is empty");

	if (member_password.length == 0)
		throw translate_string('Password is empty');

	if (member_password != confirm_password)
		throw translate_string('Inconsistent password entered twice');

	var cmd = {
		action: 'member_register',
		version: 2,
		type: 'request',
		from: 'client',
		target: 'wss-server',
		data: {
			member_account: member_account,
			passwordmd5: md5(member_password)
		}
	};

	CallFunction('WSSSEND ' + JSON.stringify(cmd));

	$('#registerForm button[type="submit"]').prop('disabled', false);
	return false;
}


function admin_exit_form_submit()
{
	$('#adminexitForm button[type="submit"]').prop('disabled', true);

	var password = $("#adminexitForm input[name=password]").val();
	if (password.length == 0)
	{
		$('#adminexitForm button[type="submit"]').prop('disabled', false);
		return false;
	}

	var password_hash = sha256(md5(password));
	if (theSettings.admin_password.toLowerCase() != password_hash.toLowerCase()) {
		setTimeout(function() {
			sweetAlert(translate_string("Error"), translate_string("Wrong password!"), "error");
		},100);
		$('#adminexitForm button[type="submit"]').prop('disabled', false);
		return false;
	}

	var cmd = { action: 'syslog', version: 2, type: 'request', from: 'client',	target: 'wss-server', data: {event: 'ADMINEXIT'} };
	CallFunction('WSSSEND ' + JSON.stringify(cmd));

	unlock_all();
	CallFunction("EXIT");
	$('#adminexitForm button[type="submit"]').prop('disabled', false);
	return false;
}

function lock_form_submit()
{
	$('#lockForm button[type="submit"]').prop('disabled', true);
	theLockScreenPassword = $('#lockForm input[name=password]').val();
	$('.myModalLock').modal('hide');

	CallFunction("LOCK 65535");
	CallFunction("SETWINDOWSIZE -1*-1");
	theLastWindowSize = "-1*-1";
	CallFunction("SETWINDOWTOPMOST 1");

	$('#page_lock').show();
	$('#unlockForm input[name=username]').val(thePCStatus.member_account);
	$('#unlockForm input[name=password]').val('');
	$('#unlockForm input[name=password]').focus();
	$('#lockForm button[type="submit"]').prop('disabled', false);

	return false;
}


function unlock_form_submit()
{
	$('#unlockForm button[type="submit"]').prop('disabled', true);
	var pwd = $('#unlockForm input[name=password]').val();
	if (pwd != theLockScreenPassword) {
		setTimeout(function() {
			sweetAlert(translate_string("Error"), translate_string("Wrong password!"), "error");
		},100);
		$('#unlockForm button[type="submit"]').prop('disabled', false);
		return false;
	}

	if(is_logined())
	{
		if (theSettings.license_show_client_mode == 'full screen') {
			CallFunction("SETWINDOWSIZE -3*-3"); // no topmost
			theLastWindowSize = "-3*-3";
			CallFunction("SETWINDOWTOPMOST 0");
		}

		if (typeof(theSettings.license_show_client_mode) == 'undefined' || theSettings.license_show_client_mode == 'maximized') {
			CallFunction("SETWINDOWSIZE -2*-2");
			theLastWindowSize = "-2*-2";
		}

		if (theSettings.license_show_client_mode == 'minimized') {
			CallFunction("SETWINDOWSIZE -2*-2");
			theLastWindowSize = "-2*-2";
			CallFunction("HIDEWINDOW");
		}

		/*
			TASKMGR  = 0x01,	// disable task manager (Ctrl+Alt+Del)
			TASKKEYS = 0x02,	// disable task keys (Alt-TAB, etc)
			TASKBAR  = 0x04,	// disable task bar
			LOGOFF   = 0x08,	// disable task bar
			WINKEYS	 = 0x10,	// disable windows keys
		*/

		CallFunction("UNLOCK 2"); // unlock alt+tab after login, user want to switch in game
		if(theSettings.license_show_client_mode != 'full screen')
			CallFunction("UNLOCK 4"); // only enable taskbar
	}

	$('#page_lock').hide();
	$('#unlockForm button[type="submit"]').prop('disabled', false);

	return false;
}

function minimize()
{
	CallFunction("SETWINDOWSIZE -2*-2");
	theLastWindowSize = "-2*-2";
	CallFunction("HIDEWINDOW");
}

function feedback_form_submit()
{
	$('#feedbackForm button[type="submit"]').prop('disabled', true);

	var subject = $('#feedbackForm input[name=subject]').val();
	var message = $('#feedbackForm textarea[name=message]').val();

	if (subject.length == 0) {
		sweetAlert(translate_string("Error"), translate_string("Subject can not be empty!"), "error");
		$('#feedbackForm button[type="submit"]').prop('disabled', false);
		return false;
	}

	if (message.length == 0) {
		sweetAlert(translate_string("Error"), translate_string("Message can not be empty!"), "error");
		$('#feedbackForm button[type="submit"]').prop('disabled', false);
		return false;
	}

	var cmd = {
		action: 'customer_feedback',
		version: 2,
		type: 'request',
		from: 'client',
		target: 'wss-server',
		data: {
			member_account: thePCStatus.member_account,
			subject: subject,
			message: message
		}
	};

	CallFunction('WSSSEND ' + JSON.stringify(cmd));
	toast(translate_string("Your feedback has been sent"));
	$('.myModalFeedback').modal('hide');

	$('#feedbackForm button[type="submit"]').prop('disabled', false);
	return false;
}


function change_password_form_submit()
{
	$('#passwordForm button[type="submit"]').prop('disabled', true);

	var old_password = $("#passwordForm input[name=old_password]").val();
	var new_password = $("#passwordForm input[name=new_password]").val();
	var confirm_password = $("#passwordForm input[name=confirm_password]").val();

	if(old_password == '')
	{
		sweetAlert(translate_string("Error"), translate_string("Old password can not be empty!"), "error");
		$('#passwordForm button[type="submit"]').prop('disabled', false);
		return false;
	}
	if(new_password == '')
	{
		sweetAlert(translate_string("Error"), translate_string("New password can not be empty!"), "error");
		$('#passwordForm button[type="submit"]').prop('disabled', false);
		return false;
	}
	if(confirm_password == '')
	{
		sweetAlert(translate_string("Error"), translate_string("Confirm password can not be empty!"), "error");
		$('#passwordForm button[type="submit"]').prop('disabled', false);
		return false;
	}
	if(new_password != confirm_password)
	{
		sweetAlert(translate_string("Error"), translate_string("The new password and confirm password do not match!"), "error");
		$('#passwordForm button[type="submit"]').prop('disabled', false);
		return false;
	}

	var data = {
		action:'member_change_password',
		version: 2,
		type: 'request',
		from: 'client',
		target: 'wss-server',
		data: {
			member_account: thePCStatus.member_account,
			old_password_md5: md5(old_password),
			new_password_md5: md5(new_password)
		}
	};

	CallFunction("WSSSEND " + JSON.stringify(data));
	$('#passwordForm button[type="submit"]').prop('disabled', false);
	return false;
}


function confirm_checkout_submit()
{
	if (theIsHomeVersion) {
		var cmd = {
			action: 'request_checkout',
			version: 2,
			type: 'request',
			from: 'client',
			target: 'wss-server',
			data: {
				member_recent_played: theGameList.member_recent_played
			}};
		CallFunction('WSSSEND ' + JSON.stringify(cmd));

		process_wss_package({ action: 'client_status', version: 2, type: 'request', from: 'wss-server', target: 'client', status: 'success', data: {client_status: { member_account: '' }}});
		return false;
	}

	$('.myModalConfirmCheckout button[type="submit"]').prop('disabled', true);

	$('.myModalConfirmCheckout').modal('hide');

	if (!theWssLogined) {
		toast(translate_string("Cannot send checkout request, please contact admin"));
		$('.myModalConfirmCheckout button[type="submit"]').prop('disabled', false);
		return false;
	}

	if (is_logined() && (thePCStatus.member_group_id == MEMBER_GROUP_PREPAID || thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID))
		toast(translate_string("This session needs to check out from server, please contact admin."));

	var cmd = {
		action: 'request_checkout',
		version: 2,
		type: 'request',
		from: 'client',
		target: 'wss-server',
		data: {
			member_recent_played: theGameList.member_recent_played
		}};
	CallFunction('WSSSEND ' + JSON.stringify(cmd));
	$('.myModalConfirmCheckout button[type="submit"]').prop('disabled', false);

	return false;
}

function rungame_show_dialog(game_id)
{
	theGames.forEach(function(obj) {
		if (game_id != obj.pkg_id)
			return;

		$('.myModalRunGame input[name=game_id]').val(obj.pkg_id);
		$('.myModalRunGame .modal-title').html(obj.pkg_name);
		$('.myModalRunGame').modal('show');
	})
}

function rungame_switch_to()
{
	var game_id = $('.myModalRunGame input[name=game_id]').val();
	$('.myModalRunGame').modal('hide');
	CallFunction("RUNGAME_SWITCH_TO " + game_id);
}

function rungame_terminate()
{
	var game_id = $('.myModalRunGame input[name=game_id]').val();
	$('.myModalRunGame').modal('hide');
	CallFunction("RUNGAME_TERMINATE " + game_id);
}

function game_tracker()
{
	// game api
	if (typeof(theLocalParams) != 'undefined' && typeof(theLocalParams.beta) != 'undefined' && theLocalParams.beta == 1)
		CallFunction("GAMETRACKER " + thePCStatus.member_id + " " + thePCStatus.status_pc_token);
}

///////////////////////////////////// element click events ////////////////////////////////////////////
function show_set_lockpassword_dialog()
{
	$('#lockForm input[name=password]').val('');
	$('.myModalLock').modal('show');
	document.getElementById('lockform_password').focus();
}


function checkout_click() {
	if (thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_PREPAID && thePCStatus.member_group_id != MEMBER_GROUP_OFFER)
		$('.myModalConfirmCheckout').modal('show');
}

function close_click() {
	CallFunction("MINER_STOP");
	unlock_all();
	CallFunction("EXIT");
}

function customer_feedback()
{
	$('#feedbackForm input[name=subject]').val('');
	$('#feedbackForm textarea[name=message]').val('');

	$('.myModalFeedback').modal('show');
}


function audio_settings()
{
	CallFunction("RUN SndVol.exe");
}

function display_settings()
{
	CallFunction("RUN control.exe desk.cpl");
}

function mouse_settings()
{
	CallFunction("RUN control.exe main.cpl");
}

var theLastAssistSent = 0;
function send_assist()
{
	if (new Date() - theLastAssistSent >= 1000 * 300)
	{
		theLastAssistSent = new Date();
		var cmd = {
			action: 'remind',
			version: 2,
			type: 'request',
			from: 'client',
			target: 'web',
			data: {
				pc: thePCInfo.pc_name,
				level: 'error',
				timeout: 0,
				message: 'assist'
			}
		};

		CallFunction('WSSSEND ' + JSON.stringify(cmd));
	}

	toast(translate_string("Your assist request has been sent"));
}


function change_password_click()
{
	$('#passwordForm input[name=member_account]').val(thePCStatus.member_account);
	$('#passwordForm input[name=old_password]').val('');
	$('#passwordForm input[name=new_password]').val('');
	$('#passwordForm input[name=confirm_password]').val('');

	$('.myModalChangePassword').modal('show');
}

function open_news(id)
{
	theCafeNews.forEach(function(obj) {
		if (obj.news_id == id) {
			CallFunction('RUN ' + obj.news_url);
			console.log('open news ' + obj.news_url);
		}
	});
}

function open_url(url)
{
	CallFunction('RUN ' + url);
	console.log('open url ' + url);
}

///////////////////////////////////// message process ////////////////////////////////////////////

// -- CLIENT start --
// 1. client wss connected
// 2. client send login package to server
// 2. server send login + settings package to client (assign to theSettings)
// 3. server send client_status package to client (assign to thePCStatus)

// -- CLIENT login --
// 1. client send member_login package to server
// 2. server send client_status package to client

// -- TIME over --
// 1. client send auto_checkout package to server (countdown())
// 2. server send client_status package to client

// -- click CHECKOUT --
// 1. client send request_checkout package to server
// 2. server send client_status package to client

// -- session start/checkout, add time, add offer, topup member, add order using balance on CP --
// 1. server send client_status package to client
function process_wss_package(packet)
{
	if(typeof(packet.action) == 'undefined' || typeof(packet.version) == 'undefined' || typeof(packet.type) == 'undefined' || typeof(packet.data) == 'undefined' || typeof(packet.from) == 'undefined' || typeof(packet.target) == 'undefined')
		return;
	
	if(packet.version != 2 || packet.target != 'client')
		return;

	if (theGameList.process_wss_package(packet))
		return;

	if (theConvertToMember.process_wss_package(packet))
		return;

	data = packet.data;
	
	// response message
	if(packet.type == 'response'){
		
		if (packet.status == 'error') {
			$('#spinner').hide();
			if (packet.action == 'member_login') {
				show_login_page('login');
				sweetAlert(translate_string("Error"), translate_string(data.message), "error");
				return;
			}

			sweetAlert(translate_string("Error"), translate_string(data.message), "error");
			return;
		}
		
		if (packet.action == 'member_change_password') {
			sweetAlert(translate_string("Succeed"), translate_string("The password was changed successfully."), "success");
			$('.myModalChangePassword').modal('hide');
			return;
		}

		if (packet.action == 'login') {
			// after first wss connected
			if (typeof(theSettings.login_count) == 'undefined')
				theSettings.login_count = 0;

			if (theSettings.login_count == 0) {
				$('.ranking-div').hide();
				if (typeof(theSettings.license_show_ranking_in_client) == 'undefined' || theSettings.license_show_ranking_in_client == 1)
					CallFunction("API type=game-tracker-data");

				$('.currency').html(typeof(theSettings.currency) == 'undefined' ? '$' : theSettings.currency)

				$('#offers_div').hide();
				if (theSettings.license_using_billing == 0) {
					$('#games-main-region').css('width', '100%');
					$('#games-right-region').hide();
					$('#logout-button').hide();
					$('#feedback-button').hide();
					$('#assist-button').hide();
					$('#changepassword-button').hide();
				}
				if (theSettings.license_using_billing == 1) {
					$('#games-main-region').css('width', '75%');
					$('#games-right-region').show();
					$('#logout-button').show();
					$('#feedback-button').show();
					$('#assist-button').show();
				}
				if (!theIsHomeVersion && theSettings.license_using_billing == 1)
					$('#offers_div').show();

				if (theSettings.license_web_log_enable == 1 && typeof(theLocalParams) != 'undefined' && typeof(theLocalParams.server_ip) != 'undefined') {
					CallFunction('RUN {tools}\\setproxy.bat 1 "' + theLocalParams.server_ip + ':808"');
					console.log('RUN {tools}\\setproxy.bat 1 "' + theLocalParams.server_ip + ':808"');
				}

				if (theSettings.license_web_log_enable == 0) {
					CallFunction('RUN {tools}\\setproxy.bat 0 ""');
					console.log('RUN {tools}\\setproxy.bat 0 ""');
				}

				// first connect, set timeout for idle shutdown (don't move below codes to any where)
				if(!theIsHomeVersion && !is_logined() && theSettings.client_idle_mins > 0)
				{
					if (theIdleMonitorTimerId != null) {
						clearTimeout(theIdleMonitorTimerId);
						theIdleMonitorTimerId = null;
					}
					theIdleMonitorTimerId = setTimeout(function () {
						if (theSettings.client_idle_action.toLowerCase() == 'run') {
							console.log('RUN run.bat');
							CallFunction('RUN run.bat');
						}

						if (theSettings.client_idle_action.toLowerCase() == 'shutdown') {
							unlock_all();
							CallFunction("SHUTDOWN ONLY");
						}
					}, theSettings.client_idle_mins * 1000 * 60);
				}
			}

			theSettings.login_count ++;
			return;
		}

		if (packet.action == 'submit_order') {
			toast(translate_string('Your order submitted'));
			if (data.pay_method == 3) {
				theShop.gift_cart_clear();
				return;
			}
			theShop.cart_clear();
		}

		return; // return other response message
	}

	// reply the request message
	CallFunction('WSSSEND ' + JSON.stringify({ action: packet.action, version: 2, type: 'response', from: 'client', target: 'wss-server', status: 'success', data: {} }));
	// already has session, auto start session
	// checkout command only from CP!!
	// request message
	if(packet.action == 'admin_message'){
		toastr.options.tapToDismiss = true;
		toastr.options.timeOut = 0;
		toastr.options.extendedTimeOut = 0;
		toastr.info(translate_string('Message from admin:') + ' ' + data.message);
		CallFunction("PLAYSOUND customized/admin-message.wav admin-message.wav");
		$('#block-div').show();
		$('.toast').click(function(){
			$('#block-div').hide();
		});
		return;
	}

	if (packet.action == 'client_status') {
		$('#spinner').hide();
		// if disable billing, auto login
		if (theSettings.license_using_billing == 0 && !theClientStatusInitialized) {
			theClientStatusInitialized = true;
			guest_login();
			return;
		}

		var last_login_status = is_logined();
		var member_loan = 0;
		if (last_login_status && thePCStatus.member_loan > 0)
			member_loan = thePCStatus.member_loan;

		countdown_stop();
		thePCStatus = data.client_status;

		console.log("Current state is " + (is_logined() ? 'logined' : 'logout'));
		console.log("Previous state is " + (last_login_status ? 'logined' : 'logout'));

		var d = new Date();
		thePCStatus.login_time = parseInt((d.getTime() + d.getTimezoneOffset()*60*1000)/1000);  // UTC time
		if(thePCStatus.member_group_name == null)
		{
			if(thePCStatus.member_group_id == MEMBER_GROUP_DEFAULT)
			{
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Default');
			}

			if(thePCStatus.member_group_id == MEMBER_GROUP_GUEST)
			{
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Guest');
			}

			if(thePCStatus.member_group_id == MEMBER_GROUP_PREPAID)
			{
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Prepaid');
			}

			if(thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID)
			{
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Postpaid');
			}

			if(thePCStatus.member_group_id == MEMBER_GROUP_FREE)
			{
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Free');
			}

			if(thePCStatus.member_group_id == MEMBER_GROUP_OFFER)
			{
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Offer');
			}
		}

		if(thePCStatus.status_connect_time_left && thePCStatus.status_connect_time_left.length > 0)
		{
			// if time left < 00:00:00
			if (thePCStatus.status_connect_time_left.charAt(0) == '-')
			{
				thePCStatus.status_connect_time_left = -1;
			}
			else
			{
				var items = thePCStatus.status_connect_time_left.split(':');
				if(items.length == 0)
					thePCStatus.status_connect_time_left = 0;
				// parseInt("08") and parseInt("09") in wke return 0, must use parseInt("08", 10)
				if(items.length == 1)
					thePCStatus.status_connect_time_left = parseInt(items[0], 10);
				if(items.length == 2)
					thePCStatus.status_connect_time_left = parseInt(items[0], 10) * 60 + parseInt(items[1], 10);
				if(items.length == 3)
					thePCStatus.status_connect_time_left = parseInt(items[0], 10) * 60 * 60 + parseInt(items[1], 10) * 60 + parseInt(items[2], 10);
			}
		}

		// postpaid show time used
		if(thePCStatus.status_connect_time_duration && thePCStatus.status_connect_time_duration.length > 0)
		{
			// if time left < 00:00:00
			var items = thePCStatus.status_connect_time_duration.split(':');
			if(items.length == 0)
				thePCStatus.status_connect_time_duration = 0;
			// parseInt("08") and parseInt("09") in wke return 0, must use parseInt("08", 10)
			if(items.length == 1)
				thePCStatus.status_connect_time_duration = parseInt(items[0], 10);
			if(items.length == 2)
				thePCStatus.status_connect_time_duration = parseInt(items[0], 10) * 60 + parseInt(items[1], 10);
			if(items.length == 3)
				thePCStatus.status_connect_time_duration = parseInt(items[0], 10) * 60 * 60 + parseInt(items[1], 10) * 60 + parseInt(items[2], 10);
		}

		// in login page
		if (!is_logined())
		{
			stop_game_timers();
			
			if(last_login_status) // after checkout
			{
				CallFunction('RUN logout.bat');
				
				// game api
				// game_tracker();

				show_login_page('login');
				theEvents.reset();

				if(theIsHomeVersion)
					return;

				// switch to icafemenu
				CallFunction("RUNGAME_SWITCH_TO 0");

				if (member_loan > 0) {
					$('.myModalMessage .modal-title').html(translate_string('Your Outstanding Bill'));
					$('.myModalMessage .modal-body p').html(translate_string('Your total outstanding bill is now {0} {1} which can be paid at the front desk.').replace('{0}', member_loan).replace('{1}', theSettings.currency));
					$('.myModalMessage').modal('show');
				}

				var client_idle_mins = (typeof(theSettings.client_idle_mins) != 'undefined' ? theSettings.client_idle_mins : 0);
				if (client_idle_mins > 0)
				{
					// action after idle time
					if (theIdleMonitorTimerId != null) {
						clearTimeout(theIdleMonitorTimerId);
						theIdleMonitorTimerId = null;
					}
					console.log('Will ' + theSettings.client_idle_action + ' after idle ' + client_idle_mins + ' minutes');
					theIdleMonitorTimerId = setTimeout(function () {

						if (theSettings.client_idle_action.toLowerCase() == 'run') {
							console.log('RUN run.bat');
							CallFunction('RUN run.bat');
						}

						if (theSettings.client_idle_action.toLowerCase() == 'shutdown') {
							unlock_all();
							console.log('Shutdown');
							CallFunction("SHUTDOWN ONLY");
						}

						if (theSettings.client_idle_action.toLowerCase() == 'reboot') {
							unlock_all();
							console.log('Reboot');
							CallFunction("SHUTDOWN REBOOT");
						}

						if (theSettings.client_idle_action.toLowerCase() == 'logoff') {
							unlock_all();
							console.log('Logoff');
							CallFunction("SHUTDOWN LOGOFF");
						}

						if (theSettings.client_idle_action.toLowerCase() == 'close all apps') {
							// kill all apps
							console.log('Close all apps');
							CallFunction("RUNGAME_TERMINATE 0");
						}

					}, client_idle_mins * 1000 * 60);
				}

				var pc_mining_enabled = (typeof(thePCStatus.pc_mining_enabled) != 'undefined' ? thePCStatus.pc_mining_enabled : 0);
				if (pc_mining_enabled === 1)
				{
					var client_mining_idle_mins = typeof(theSettings.client_mining_idle_mins) != 'undefined' ? theSettings.client_mining_idle_mins : 5;
					console.log("Will start miner after " + client_mining_idle_mins + " minutes");
					theIdleMiningTimerId = setTimeout(function () {
						var pc_mining_tool = (typeof(thePCStatus.pc_mining_tool) != 'undefined' ? thePCStatus.pc_mining_tool : 'nicehash');
						var pc_mining_options = (typeof(thePCStatus.pc_mining_options) != 'undefined' ? thePCStatus.pc_mining_options : '');
						CallFunction("MINER_START " + pc_mining_tool + " " + pc_mining_options);
					}, client_mining_idle_mins * 1000 * 60);
				}

				return;
			}
			
			if (theIsHomeVersion) // home version don't mining in login page
				return;

			// normal login page
			
			// show booking info
			if (typeof(thePCStatus.recent_booking) != 'undefined' && thePCStatus.recent_booking != null)
			{
				toast(translate_string("Recent booking") + ": " + thePCStatus.recent_booking, 'warning');
			}
			
			var pc_mining_enabled = (typeof (thePCStatus.pc_mining_enabled) != 'undefined' ? thePCStatus.pc_mining_enabled : 0);
			if (pc_mining_enabled == 1 && theIdleMiningTimerId == null) {
				var client_mining_idle_mins = typeof (theSettings.client_mining_idle_mins) != 'undefined' ? theSettings.client_mining_idle_mins : 5;
				console.log("Will start miner after " + client_mining_idle_mins + " minutes");
				theIdleMiningTimerId = setTimeout(function () {
					var pc_mining_tool = (typeof (thePCStatus.pc_mining_tool) != 'undefined' ? thePCStatus.pc_mining_tool : 'nicehash');
					var pc_mining_options = (typeof (thePCStatus.pc_mining_options) != 'undefined' ? thePCStatus.pc_mining_options : '');
					CallFunction("MINER_START " + pc_mining_tool + " " + pc_mining_options);
				}, client_mining_idle_mins * 1000 * 60);
			}
			return;
		}
		// end login page
		
		// already logined
		theConvertToMember.init();


		// login in & previous state is checkout & not locked
		if(!last_login_status) // from login to logined
		{
			if (theEvents.events.length == 0)
				theEvents.load_list();

			if(!theIsHomeVersion)
			{
				if (theSettings.license_show_client_mode == 'full screen') {
					CallFunction("SETWINDOWSIZE -3*-3"); // no topmost
					theLastWindowSize = "-3*-3";
					CallFunction("SETWINDOWTOPMOST 0");
				}

				if (typeof(theSettings.license_show_client_mode) == 'undefined' || theSettings.license_show_client_mode == 'maximized') {
					CallFunction("SETWINDOWSIZE -2*-2");
					theLastWindowSize = "-2*-2";
				}

				if (theSettings.license_show_client_mode == 'minimized') {
					CallFunction("SETWINDOWSIZE -2*-2");
					theLastWindowSize = "-2*-2";
					CallFunction("HIDEWINDOW");
				}
				
				/*
					TASKMGR  = 0x01,	// disable task manager (Ctrl+Alt+Del)
					TASKKEYS = 0x02,	// disable task keys (Alt-TAB, etc)
					TASKBAR  = 0x04,	// disable task bar
					LOGOFF   = 0x08,	// disable task bar
					WINKEYS	 = 0x10,	// disable windows keys
				*/
				
				CallFunction("UNLOCK 2"); // unlock alt+tab after login, user want to switch in game
				if(theSettings.license_show_client_mode != 'full screen')
					CallFunction("UNLOCK 4"); // only enable taskbar
			}
			
			CallFunction('RUN login.bat');
			
			$('#news_div').hide();
			if (typeof(theCafeNews) != 'undefined' && theCafeNews != null && theCafeNews.length > 0) {
				$('#news_carousel_main .carousel-inner').html(tmpl('tmpl-news', { items: theCafeNews } ));
				translate_obj($('#news_carousel_main .carousel-inner'));
				$('#news_carousel_main').carousel({ interval: 5000 });
				if (theCafeNews.length > 0)
					$('#news_div').show();
				if (theCafeNews.length > 1)
				{
					$('#news_carousel_main .carousel-control-prev').show();
					$('#news_carousel_main .carousel-control-next').show();
				}
				else
				{
					$('#news_carousel_main .carousel-control-prev').hide();
					$('#news_carousel_main .carousel-control-next').hide();
				}
			}

			theGameList.show();
			stop_login_timers();
			
			if (theIsHomeVersion) 
			{
				theEvents.show();
				var pc_mining_tool = (typeof (thePCStatus.pc_mining_tool) != 'undefined' ? thePCStatus.pc_mining_tool : 'nicehash');
				var pc_mining_options = (typeof (thePCStatus.pc_mining_options) != 'undefined' ? thePCStatus.pc_mining_options : '');
				CallFunction("MINER_START " + pc_mining_tool + " " + pc_mining_options);
			}
			else 
			{
				CallFunction("MINER_STOP");
				if (theSettings.license_save_enable)
				{
					if(is_member_logined())
						CallFunction("INIT_GAME_SAVING " + thePCStatus.member_account);
					else
						CallFunction("INIT_GAME_SAVING guest_" + thePCInfo.pc_name);
				}
			}

			// start monitoring game track for fornite/lol
			if (theGameTrackerInterval != null)
			{
				clearInterval(theGameTrackerInterval);
				theGameTrackerInterval = null;
			}
			// stop game api tracker currently
			// theGameTrackerInterval = setInterval(game_tracker, 1000 * 60 * 5);
		}
		// end from login to logined

		// already logined but wss reconnect, or topup update left time
		
		if (typeof(thePCStatus.recent_booking) != 'undefined' && thePCStatus.recent_booking != null) 
		{
			toast(translate_string("Recent booking") + ": " + thePCStatus.recent_booking, 'warning');
		}

		// now state is login in (from logined to logined)

		// don't show checkout button if not member login
		$('#logout-button').hide();
		if (thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_PREPAID && thePCStatus.member_group_id != MEMBER_GROUP_OFFER)
			$('#logout-button').show();

		// show member info
		$('#member-info .name').html(thePCStatus.member_account.toUpperCase() + " / " + thePCStatus.member_group_name.toUpperCase());
		
		$('#cafe_info_member_logo').attr('src', 'icons/mg-' + (thePCStatus.member_group_id > MEMBER_GROUP_DEFAULT ? thePCStatus.member_group_id.toString() : '0') + '.png');
	
		if (theSettings.license_using_billing == 1)
		{
			theAvailableOffers = [];
			var id = 1;
			for (var i=0; i<thePCStatus.available_offers.length; i++)
			{
				var is_active = (thePCStatus.available_offers[i].product_name == thePCStatus.offer_in_using && i == 0);
				theAvailableOffers.push({
					id: id++,
					is_active: is_active,
					time_type: 'offer',
					name: thePCStatus.available_offers[i].product_name.toUpperCase(),
					total_secs: thePCStatus.available_offers[i].product_seconds,
					left_secs: (is_active ? thePCStatus.status_connect_time_left : thePCStatus.available_offers[i].member_offer_left_seconds)
				});
			}

			if (thePCStatus.member_balance_bonus_left_seconds > 0)
			{
				var is_active = (thePCStatus.offer_in_using == null || thePCStatus.offer_in_using.length == 0);
				var name = translate_string('BALANCE');
				var left_secs = is_active ? thePCStatus.status_connect_time_left : thePCStatus.member_balance_bonus_left_seconds;
				if (thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID || thePCStatus.member_group_id == MEMBER_GROUP_FREE) {
					name = "";
					left_secs = thePCStatus.member_balance_bonus_left_seconds;
				}

				theAvailableOffers.push({
					id: id++,
					is_active: is_active,
					time_type: 'balance',
					name: name,
					total_secs: thePCStatus.member_balance_bonus_left_seconds,
					left_secs: left_secs
				});
			}

			// add total
			if (theAvailableOffers.length > 1)
			{
				var total_secs = 0;
				var left_secs = 0;
				theAvailableOffers.forEach(function(obj) {
					total_secs += obj.total_secs;
					left_secs += obj.left_secs;
				});

				theAvailableOffers.splice(0, 0, {
					id: id++,
					is_active: false,
					time_type: 'total',
					name: translate_string('TOTAL AVAILABLE OFFERS'),
					total_secs: total_secs,
					left_secs: left_secs
				});
			}

			if (theAvailableOffers.length > 0)
				theAvailableOffers[0].is_active = true;

			$('#offers').html(tmpl('tmpl-offers', { items: theAvailableOffers } ));
			translate_obj($('#offers'));
			$('#carousel_main').carousel({ interval: false });

			if (theAvailableOffers.length > 1)
			{
				$('#carousel_main .carousel-control-prev').show();
				$('#carousel_main .carousel-control-next').show();
			}
			else
			{
				$('#carousel_main .carousel-control-prev').hide();
				$('#carousel_main .carousel-control-next').hide();
			}
		}

		countdown_start();
		if (!theIsHomeVersion) {
			if (theQueryRunGameIdsIntervalId != null) {
				clearInterval(theQueryRunGameIdsIntervalId);
				theQueryRunGameIdsIntervalId = null;
			}
			query_rungame_ids();
			theQueryRunGameIdsIntervalId = setInterval(query_rungame_ids, 3000);
		}

		// show left money and bonus
		$('#member_balance_realtime').parent().css('display', thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_FREE ? 'block' : 'none');
		$('#member_balance_bonus_realtime').parent().css('display', thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_FREE && thePCStatus.member_group_id != MEMBER_GROUP_PREPAID ? 'block' : 'none');
		$('#member_coin_balance').parent().css('display', thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_FREE && thePCStatus.member_group_id != MEMBER_GROUP_PREPAID ? 'block' : 'none');
		$('#postpaid_pc_name').parent().css('display', thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID || thePCStatus.member_group_id == MEMBER_GROUP_FREE ? 'block' : 'none');

		$('#member_balance_realtime').html('');
		$('#member_balance_bonus_realtime').html('');
		$('#member_coin_balance .value').html('');
		if (theSettings.license_using_billing == 1 && thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_FREE) {
			var member_balance_realtime = accounting.formatMoney(parseFloat(thePCStatus.member_balance_realtime), '', 2, ' ', '.').replace('.00', '');
			if (thePCStatus.member_balance_realtime > 1000000)
				member_balance_realtime = accounting.formatMoney(parseFloat(thePCStatus.member_balance_realtime / 1000000.0), '', 2, ' ', '.').replace('.00', '') + "M";
			$('#member_balance_realtime').html(member_balance_realtime);

			var member_balance_bonus_realtime = accounting.formatMoney(parseFloat(thePCStatus.member_balance_bonus_realtime), '', 2, ' ', '.').replace('.00', '');
			if (thePCStatus.member_balance_bonus_realtime > 1000000)
				member_balance_bonus_realtime = accounting.formatMoney(parseFloat(thePCStatus.member_balance_bonus_realtime / 1000000.0), '', 2, ' ', '.').replace('.00', '') + "M";
			$('#member_balance_bonus_realtime').html(member_balance_bonus_realtime);

			var member_coin_balance = accounting.formatMoney(parseFloat(thePCStatus.member_coin_balance), '', 2, ' ', '.').replace('.00', '');
			if (thePCStatus.member_coin_balance > 1000000)
				member_coin_balance = accounting.formatMoney(parseFloat(thePCStatus.member_coin_balance / 1000000.0), '', 2, ' ', '.').replace('.00', '') + "M";
			$('#member_coin_balance').html(member_coin_balance);
		}
		// end now state is login in
		return;
	}
	// end client_status

	if (packet.action == 'quit' || packet.action == 'exit') {
		unlock_all();
		CallFunction("EXIT");
		return;
	}

	if (packet.action == 'shutdown' && !theIsHomeVersion) {
		unlock_all();
		CallFunction("SHUTDOWN ONLY");
		return;
	}

	if (packet.action == 'reboot' && !theIsHomeVersion) {
		unlock_all();
		CallFunction("SHUTDOWN REBOOT");
		return;
	}

	if (packet.action == 'logoff' && !theIsHomeVersion) {
		unlock_all();
		CallFunction("SHUTDOWN LOGOFF");
		return;
	}

}


function OnCommand(strCmd, strParam)
{
	strParam = strParam.replace(/____@@@____/g, '\\')
	strParam = strParam.replace(/____@@____/g, '"')
	strParam = strParam.replace(/____@____/g, '\'')
	strParam = strParam.replace(/___@@@@___/g, '\r')
	strParam = strParam.replace(/___@@@@@___/g, '\n')

	if (strCmd == "CallExeDone") {
		var cols = strParam.split(' ');
		if (typeof(cols) == 'undefined')
			return;
		if (cols.length == 0)
			return;
		var action = cols[0];

		if (action == 'INIT_GAME_SAVING') {
			setTimeout(function () {
				$('input[name=search]').css({background: '#ffffff'});

				setTimeout(function () {
					$('input[name=search]').css({background: 'transparent'});
				}, 500);

			}, 500);
		}

		return;
	}

	if (strCmd == "SHOWMSG") {
		sweetAlert("", translate_string(strParam), "info");
		return;
	}

	if (strCmd == 'TOAST') {
		toast(translate_string(strParam));
		return;
	}
	
	// if wss_timeout, lock the client
	if (strCmd == 'WSS_TIMEOUT') {
		// direct to login page
		process_wss_package({ action: 'client_status', version: 2, type: 'request', from: 'wss-server', target: 'client', status: 'success', data: {client_status: { member_account: '' }}});
		return;
	}

	if (strCmd == 'WSS_LOGIN') {
		theWssLogined = true;

		$('#loginForm input[name=username]').prop('disabled', !theWssLogined);
		$('#loginForm input[name=password]').prop('disabled', !theWssLogined);
		$('#loginForm button').css({opacity: 1.0});
		return;
	}

	if (strCmd == 'WSS_LOGIN_FAILED') {
		if (!theIsHomeVersion)
			return;
		$('#spinner').hide();
		show_login_page('login');
		sweetAlert(translate_string('Error'), translate_string('Login failed'), 'error');
		return;
	}

	if (strCmd == 'WSS_DISCONNECTED') {
		theWssLogined = false;

		if (theIsHomeVersion)
			return;
		$('#loginForm input[name=username]').prop('disabled', !theWssLogined);
		$('#loginForm input[name=password]').prop('disabled', !theWssLogined);
		$('#loginForm button').css({opacity: 0.5});
		return;
	}

	if (strCmd == 'WM_DISPLAYCHANGE') {
		if (theLastWindowSize.length > 0)
			CallFunction("SETWINDOWSIZE " + theLastWindowSize);

		return;
	}

	if (strCmd == 'WSS_COMMAND') {
		var data = JSON.parse(strParam);
		process_wss_package(data);

		return;
	}

	if (strCmd == 'COVERSHOW') {
		$('#spinner').show();
		return;
	}

	if (strCmd == 'COVERHIDE') {
		$('#spinner').hide();
		return;
	}

	if (strCmd == "RUNGAME_IDS") {
		var ids = strParam.split(',');
		var html = '';
		for (var i=0; i<ids.length; i++) {

			theGames.forEach(function(obj) {
				if (obj.pkg_id == ids[i]) {
					html += ('<a href="javascript:rungame_show_dialog(' + obj.pkg_id + ')" data-toggle="tooltip" data-placement="bottom" title="' + obj.pkg_name + '"><img src="icons/' + obj.pkg_id + '.png" onerror="this.src=\'images/default-icon.png\'"></a>');
				}
			});

		}
		$('.header-run-games').html(html);
		$('.header-run-games [data-toggle="tooltip"]').tooltip();
		return;
	}

	if (strCmd == "APIResponse") {
		var pos = strParam.indexOf(' ');
		var api_action = strParam.substr(0, pos);
		strParam = strParam.substr(pos+1);
		if(strParam.length == 0)
			return;
		var data = JSON.parse(strParam);

		if (api_action.indexOf('type=game-tracker-data') >= 0) {
			var last_ranks = [];
			var current_ranks = [];
			for (var i=0; i<data.games.length; i++) {
				var game = data.games[i];
				last_ranks.push(tmpl('tmpl-game-rank', { game_code: game.game_code, items: game.last_month, active: (i==0) }));
				current_ranks.push(tmpl('tmpl-game-rank', { game_code: game.game_code, items: game.current_month, active: (i==0) }));
			}

			$('#carousel-last-month .carousel-inner').html(last_ranks.join(''));
			$('#carousel-current-month .carousel-inner').html(current_ranks.join(''));
			translate_obj($('#carousel-last-month .carousel-inner'));
			translate_obj($('#carousel-current-month .carousel-inner'));
			$('.ranking-div').show();
			$('#carousel-last-month').carousel({ interval: 5000 });
			$('#carousel-current-month').carousel({ interval: 5000 });
			return;
		}

		if (api_action.indexOf('type=event-') >= 0) {
			theEvents.onAPIResponse(api_action, data);
			return;
		}
		return;
	}
	
	if (strCmd == "PCInfo") {
		thePCInfo = JSON.parse(strParam);
		if(!$('#page_login').is(":visible"))
			return;

		set_monitor_turn_off_timeout(thePCInfo.pc_turn_off_monitor_seconds);
		if (theIsHomeVersion)
			$('#loginForm input[name=username]').val(thePCInfo.pc_name);
		else
			$('#page_login .pc_name').html(thePCInfo.pc_name);
		
		$('#version_date').html("v. " + thePCInfo.version_date);
		
		return;
	}
}




///////////////////////////////////// UI ////////////////////////////////////////////

// <lang> No permission </lang>
// <lang> Account not exists </lang>
// <lang> Wrong password </lang>
// <lang> Operation failure </lang>
// <lang> Invalid parameter </lang>
// <lang> The password was changed successfully. </lang>
// <lang> Invalid client </lang>
// <lang> Invalid parameter </lang>
// <lang> Update client information failed </lang>
// <lang> Invalid license </lang>
// <lang> Account already exists </lang>

function main()
{
	translate_obj($('body'));
	$('[data-toggle="tooltip"]').tooltip();
	// debug for tooltip
	//$('body').tooltip({selector: "[data-toggle='tooltip']", trigger: "click"});

	theIsHomeVersion = (typeof(theLocalParams) != 'undefined' && typeof(theLocalParams.home) != 'undefined' && theLocalParams.home) ? theLocalParams.home : false;
	if (!theIsHomeVersion) {
		$('.home-only').hide();
		$('.normal-only').show();
	}
	if (theIsHomeVersion) {
		$('.normal-only').hide();
		$('.home-only').show();

		if (typeof(theCafe) == 'undefined' || typeof(theSettings) == 'undefined') {
			$('#page_login .formDiv').hide();
			$('#page_login .homecafeidDiv').show();
			$('#page_games').hide();
			$('#page_login').show();
			return;
		}
	}

	show_login_page('login');

	var logo_filename = "logo.png";
	if (theIsHomeVersion) {
		unlock_all();
		CallFunction("SETWINDOWSIZE -2*-2");
		theLastWindowSize = "-2*-2";

		logo_filename = "logo-home.png";
	}

	$('#cafe_info_cafe_logo').attr('src', 'posters/cafe_info_cafe_logo.jpg');
	$('#cafe_info_cafe_logo').attr('onerror', "this.src='images/" + logo_filename + "';")

	if (!theIsHomeVersion)
		CallFunction("WSSSTART");

	theTax = new Tax();
	theShop = new Shop();
	theGameList = new GameList();
	theEvents = new Events();
}

$(document).ready(main);

$(window).bind("load resize", function() {

	var topOffset = 190;
	var win_height = ((this.window.innerHeight > 0) ? this.window.innerHeight : this.screen.height) - 1;
	var height = win_height - topOffset;
	if (height < 1) height = 1;
	if (height > topOffset) {
	$("#games").css("height", (height) + "px");
	$("#games").css("min-height", (height) + "px");
	}
	
	if(window.innerWidth > screen.width){
		$("#page_login").css("width", "50%");
		$("#page_lock section").css("width", "50%");
	}
	if(window.innerHeight > screen.height){
		$("#page_login").css("height", "50%");
		$("#page_lock section").css("height", "50%");
	}
	
	
	//This part is not required as bootstrap has modal-dialog-centered to make the modal appear in center of the screen.
	/* 
	win_height = parseInt(win_height * 0.9, 10);
	$('.myModalConfirmCheckout .modal-dialog').css('max-height', win_height  + 'px');
	$('.myModalConfirmCheckout .modal-content').css('margin-top', parseInt((win_height - 233) / 2, 10) + 'px');

	$('.myModalMessage .modal-dialog').css('max-height', win_height  + 'px');
	$('.myModalMessage .modal-content').css('margin-top', parseInt((win_height - 233) / 2, 10) + 'px');

	$('.myModalFeedback .modal-dialog').css('max-height', win_height  + 'px');
	$('.myModalFeedback .modal-content').css('margin-top', parseInt((win_height - 389) / 2, 10) + 'px');

	$('.myModalLock .modal-dialog').css('max-height', win_height  + 'px');
	$('.myModalLock .modal-content').css('margin-top', parseInt((win_height - 318) / 2, 10) + 'px');

	$('.myModalChangePassword .modal-dialog').css('max-height', win_height  + 'px');
	$('.myModalChangePassword .modal-content').css('margin-top', parseInt((win_height - 622) / 2, 10) + 'px');

	$('.myModalRunGame .modal-dialog').css('max-height', win_height  + 'px');
	$('.myModalRunGame .modal-content').css('margin-top', parseInt((win_height - 622) / 2, 10) + 'px');
	*/
	if (is_logined() && $('#games .games-container').is(":visible"))
		theGameList.load_games_by_class(theGameList.filter_params.type, theGameList.filter_params.class, theGameList.filter_params.search);
});


$(document).keydown(function (event)
{
	theMonitorTurnOffStartTime = new Date();

	if (!is_logined()) {
		if (event.keyCode == 27)
			show_login_page('admin_exit');
		return;
	}

	if (is_locked())
		return;

	// logined and not locking
	// X = 88, B = 66, F = 70, F1 = 112
	if (event.ctrlKey && event.keyCode == 112)
		send_assist();

	if (event.ctrlKey && event.keyCode == 70)
		$('input#search-bar').focus();

	if (event.ctrlKey && event.keyCode == 88)
		checkout_click();

	if (event.ctrlKey && event.keyCode == 66)
		theShop.show();

	if (theSettings == null || typeof(theSettings.license_show_client_mode) == 'undefined' || theSettings.license_show_client_mode != 'full screen') {
		if (event.ctrlKey && event.keyCode == 'M'.charCodeAt(0))
			CallFunction('HIDEWINDOW');
	}
});

$(document).mousedown(function(event) {
	if (!is_logined())
		theMonitorTurnOffStartTime = new Date();
	return true;
});

function countdown()
{
	if (thePCStatus.status_connect_time_left < 0)
	{
		// The end of the countdown does not mean the customer time is all used up, because the customer may have offers and balance.
		// send auto_checkout package to wss server, the wss server will send client_status package to me after switch to another offer or balance.
		var cmd = {action: 'auto_checkout', version: 2,	type: 'request', from: 'client', target: 'wss-server',	data: {}};
		CallFunction('WSSSEND ' + JSON.stringify(cmd));

		clearInterval(theCountDownIntervalId);
		theCountDownIntervalId = null;
		return;
	}
	
	if (thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID || thePCStatus.member_group_id == MEMBER_GROUP_FREE) {
		$('#postpaid_pc_name').html(thePCStatus.pc_name);

		thePCStatus.status_connect_time_duration += 1;  // if postpaid, show time used
		if(theAvailableOffers.length > 0)
		{
			$('#available-' + theAvailableOffers[0].id + ' .progress-bar').css('width', '100%');
			$('#available-' + theAvailableOffers[0].id + ' .remaining').html('Time: ' + format_time(thePCStatus.status_connect_time_duration));
		}
		return;
	}

	for (var i=0; i<theAvailableOffers.length; i++) {
		var percent = 0;
		if (theAvailableOffers[i].total_secs > 0)
			percent = Math.min(parseInt((theAvailableOffers[i].left_secs / theAvailableOffers[i].total_secs) * 100.0), 100);

		$('#available-' + theAvailableOffers[i].id + ' .progress-bar').css('width', percent + '%');
		$('#available-' + theAvailableOffers[i].id + ' .remaining').html(translate_string('Time Remaining:') + ' ' + format_time(theAvailableOffers[i].left_secs));
	}

	var total_time_left = 0;
	for (i=0; i<theAvailableOffers.length; i++) {
		if (theAvailableOffers[i].time_type === 'total')
			continue;
		total_time_left += theAvailableOffers[i].left_secs;
	}

	var hour = parseInt(total_time_left / 3600);
	var min = parseInt((total_time_left % 3600) / 60);
	for (var m=1; m<=5; m++)
	{
		if (hour <= 0 && min <= m) {
			if (theTimeWarnJobs.indexOf(m) >= 0)
				break;

			toast(translate_string("Your remaining time is less than {0} minutes").replace('{0}', m), 'warning');

			console.log("time warning");
			CallFunction("PLAYSOUND customized/" + m + "min_left.wav "  + m + "min_left.wav");

			theTimeWarnJobs.push(m);
			break;
		}
	}

	thePCStatus.status_connect_time_left -= 1;

	for (i=0; i<theAvailableOffers.length; i++) {
		if (theAvailableOffers[i].time_type === 'total' || theAvailableOffers[i].is_active) {
			theAvailableOffers[i].left_secs -= 1;
		}

		// if offer will expired in 5 minutes
		if (theAvailableOffers[i].is_active && theAvailableOffers[i].time_type === 'offer' && theAvailableOffers[i].left_secs < 300 && Object.keys(theAvailableOffers[i]).indexOf('has_been_warned') < 0) {
			theAvailableOffers[i].has_been_warned = true;
			// next offer or balance
			let next_time_obj = null;
			for (let j=i+1; j<theAvailableOffers.length; j++) {
				if (theAvailableOffers[j].time_type === "total")
					continue;
				next_time_obj = theAvailableOffers[j];
				break;
			}
			if (next_time_obj == null)
				continue;

			let alert_message = translate_string('{0} offer will be expired in 5 minutes, auto switch to balance mode').replace('{0}', theAvailableOffers[i].name);
			if (next_time_obj.time_type === 'offer')
				alert_message = translate_string('{0} offer will be expired in 5 minutes, auto switch to {1} offer').replace('{0}', theAvailableOffers[i].name).replace('{1}', next_time_obj.name);

			console.log(alert_message);
			toast(alert_message, 'warning');
			CallFunction("PLAYSOUND customized/" + m + "min_left.wav "  + m + "min_left.wav");
		}
	}
}

function query_rungame_ids()
{
	CallFunction("RUNGAME_QUERY_IDS");
}

// sub_div => login, member_register, admin_exit
function show_login_page(sub_div)
{
	CallFunction("LOCK 65535");
	CallFunction("SETWINDOWSIZE -1*-1");
	CallFunction("SETWINDOWTOPMOST 1");
	theLastWindowSize = "-1*-1";


		var MONTHs = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		var d = new Date();
		var current_month = d.getMonth();
		var current_year = d.getFullYear();

		var last_month = current_month-1;
		var last_year = current_year;
		if (last_month < 0) {
			last_month = 11;
			last_year -= 1;
		}

		$('#last-month-name').html(translate_string(MONTHs[last_month]) + ' ' + last_year.toString());
		$('#current-month-name').html(translate_string(MONTHs[current_month]) + ' ' + current_year.toString());

		$('body').css({'background-image': "url('posters/cafe_info_cafe_login.jpg'), url('images/lock.jpg')"});

		$('#loginForm input[name=username]').prop('disabled', !theWssLogined && !theIsHomeVersion);
		$('#loginForm input[name=password]').prop('disabled', !theWssLogined && !theIsHomeVersion);
		$('#loginForm input[name=username]').val('');
		$('#loginForm input[name=password]').val('');
		var opacity = 1.0;
		if (!theWssLogined && !theIsHomeVersion)
			opacity = 0.5;
		$('#loginForm button').css({opacity: opacity});

		if (theIsHomeVersion)
			$('#loginForm input[name=username]').val(thePCInfo.pc_name);
		else
			$('#page_login .pc_name').html(thePCInfo.pc_name);

		$('.myModalLockPassword').modal('hide');
		$('.myModalChangePassword').modal('hide');
		$('.myModalConfirmCheckout').modal('hide');
		$('.myModalFeedback').modal('hide');
		$('.myModalRunGame').modal('hide');
		$('.myModalConvertMember').modal('hide');
		$('#page_games').hide();
		$('#page_login').show();

		$('#page_login .loginDiv').hide();
		$('#page_login .registerDiv').hide();
		$('#page_login .adminexitDiv').hide();
		$('#page_login .homecafeidDiv').hide();

		if (sub_div == 'login') {
			$('#page_login .loginDiv').show();
			document.getElementById('username').focus();
		}

		if (sub_div == 'member_register')
			$('#page_login .registerDiv').show();

		if (sub_div == 'admin_exit') {
			$('#adminexitForm input[name=password]').val('');
			$('#page_login .adminexitDiv').show();
		}

		set_monitor_turn_off_timeout(thePCInfo.pc_turn_off_monitor_seconds);

}


function GameList()
{
	var that;
	this.filter_params = { type: 'home', class: '', search: '' };
	this.member_recent_played = [];
	this.local_hot_sorted_games = [];

	// 进入GAMES页后，所有的处理要重新处理，可以重进入（例如：已经是GAMES页，再进入时，LEFT_TIME要重启一下
	// 置thePCStatus时，就要重启left_time.
	this.show = function() {
		that = this;

		if ($('#page_games').css('display') != 'none')
			return;

		$('body').css({'background-image': "url('posters/cafe_info_cafe_background.jpg'), url('images/games.jpg')"});

		$('#page_login').hide();
		$('#page_games').show();

		that.local_hot_sorted_games = theGames.sort(that.local_hot_compare);
		for (var i=0; i<that.local_hot_sorted_games.length; i++) {
			that.local_hot_sorted_games[i].local_hot_rank = i+1;
		}

		$('#top-buttons .dropdown-menu').html(tmpl('tmpl-more-games-classes', { items: theClasses == null ? [] : theClasses.sort(that.class_compare) }));
		translate_obj($('#top-buttons'));
		that.load_games_by_class('home', '', '');

		$('input#search-bar').keyup(function(e){
			var new_search = $(this).val();
			if (that.filter_params.search.toLowerCase() == new_search)
				return;

			that.load_games_by_class('all', '', $(this).val());
		});

		$('#changepassword-button').hide();
		if (is_member_logined())
			$('#changepassword-button').show();

		// load recent played from client_status package
		if (typeof(thePCStatus.member_recent_played) != 'undefined' && thePCStatus.member_recent_played != null) {
			that.member_recent_played = JSON.parse(thePCStatus.member_recent_played);
		}
	}

	this.class_compare = function(a, b) {
		var ret = 0;
		if (a.class_name.toLowerCase().indexOf('steam') >= 0)
			return -1;
		if (b.class_name.toLowerCase().indexOf('steam') >= 0)
			return 1;

		if (a.class_name.toLowerCase() < b.class_name.toLowerCase())
			ret = -1;
		if (a.class_name.toLowerCase() > b.class_name.toLowerCase())
			ret = 1;

		return ret;
	};

	this.local_hot_compare = function(a, b) {
		var a_is_favorite = a.pkg_favorite;
		var b_is_favorite = b.pkg_favorite;

		var a_value = a.pkg_local_hot || 0;
		var b_value = b.pkg_local_hot || 0;

		if (a_is_favorite && !b_is_favorite)
			return -1;

		if (!a_is_favorite && b_is_favorite)
			return 1;

		var ret = 0;
		if (a_value < b_value)
			ret = -1;
		if (a_value > b_value)
			ret = 1;

		return 0 - ret;
	}

	this.is_recent_played = function(pkg_id) {
		var exists = false;
		that.member_recent_played.forEach(function(game) {
			if (game.pkg_id === parseInt(pkg_id))
				exists = true;
		})
		return exists;
	}

	this.load_games_by_class = function(type, class_name, search) {
		$('#games .container').hide();
		$('#games .games-container').show();
		class_name = decodeURIComponent(class_name);
		$('#top-buttons .btn').removeClass('active');
		$('#top-buttons button[data-type=' +  type + ']').addClass('active');
		$('#more-games').html(type != 'class' ? translate_string('More games') : class_name);

		that.filter_params = { type: type, class: class_name, search: search };
		$('input#search-bar').val(search);

		// Home, We always show the 5 games on top that member played, then show the favorite games, then order by local hot.
		// All games, it will show favorite games first, then order by local hot.
		// Licensed Games, it will show licensed games, favorite first then local hot.
		// More Games, will show menu of categories, favorite first, then local hot.
		var limit_count = Math.MAX_VALUE;

		{
			var games_width = parseInt($('#games').css('width').replace('px', ''), 10) || 0;
			games_width -= 0;
			var games_height = parseInt($("#games").css("height").replace('px', ''), 10) || 0;
			games_height -= 20;

			var item_width = 168+15;
			var item_height = 264+15;

			if (item_width <= 0)
				return;

			var cols = Math.max(Math.floor(games_width / item_width), 2);
			var rows = Math.max(Math.floor(games_height / item_height), 2);
			if (type === 'home')
				limit_count = cols*rows;

			var width = cols * item_width;
			$('#games .games-container').css("width", width+ "px");
			var padding = parseInt((games_width - width) / 2);
			$('#top-buttons').css("padding-left", padding + "px");
			$('#top-buttons').css("padding-right", padding + "px");
		}

		var sorted_games = that.local_hot_sorted_games.sort(that.local_hot_compare);
		var show_games = [];
		sorted_games.forEach(function(game) {
			if (type === 'home' && that.is_recent_played(game.pkg_id))
				return;

			if (type === 'home' && game.pkg_idc_class.toLowerCase() === 'internet tools')
				return;

			if (game.pkg_name.toLowerCase() === 'icafemenu' || game.pkg_name.toLowerCase() === 'overwolf')
				return;

			if (type === 'license' && !game.pkg_has_license)
				return;

			if (type === 'class' && class_name.length > 0 && game.pkg_idc_class != class_name)
				return;

			if (search.length > 0 && game.pkg_name.toLowerCase().indexOf(search.toLowerCase()) < 0)
				return;

			// pc groups
			var pkg_pc_group_ids = typeof(game.pkg_pc_group_ids) != 'undefined' ? game.pkg_pc_group_ids : [];
			if (pkg_pc_group_ids.length > 0 && pkg_pc_group_ids.indexOf(thePCStatus.pc_group_id) < 0)
				return;

			if (is_member_logined() && game.pkg_rating > 0 && thePCStatus.member_birthday != null && thePCStatus.member_birthday != '0000-00-00') {

				var cols = thePCStatus.member_birthday.split('-');
				if (cols.length === 3) {
					var year = cols[0];
					var month = cols[1];
					var day = cols[2];

					var ts = new Date() - new Date(year, month, day);
					var years = parseInt(ts / (3600 * 24 * 1000) / 365);

					if (years < game.pkg_rating)
						return;
				}

			}

			limit_count = limit_count - 1;
			if (limit_count < 0)
				return;

			if (type === 'home' && limit_count <= theGameList.member_recent_played.length)
				return;

			show_games.push(game);
		});

		if (type === 'home') {
			for (var i=theGameList.member_recent_played.length-1; i>=0; i--) {
				that.local_hot_sorted_games.forEach(function(game) {
					if (theGameList.member_recent_played[i].pkg_id == game.pkg_id)
						show_games.unshift(game);
				})
			}
		}

		$('#games .games-container').html(tmpl('tmpl-games', { items: show_games, type: type }));
		translate_obj($('#games .games-container'));
	}

	this.play_game = function(pkg_id, status_pc_token, use_icafecloud_license, license_account) {
		// if use license pool, cover show/hide control by pool, else show cover 3 seconds, prevent users click repeatedly

		CallFunction("RUNGAME " + pkg_id + " " + status_pc_token + " 0 " + use_icafecloud_license + " " + license_account);

		var params = 'type=update-hot&id=' + pkg_id + '&token=' + thePCStatus.status_pc_token;
		CallFunction('API ' + params);

		for (var i=0; i<that.member_recent_played.length; i++) {
			if (that.member_recent_played[i].pkg_id === parseInt(pkg_id)) {
				that.member_recent_played.splice(i, 1);
				break;
			}
		}

		that.member_recent_played.unshift({ pkg_id: parseInt(pkg_id) });
		if (that.member_recent_played.length > 5)
			that.member_recent_played.splice(5,that.member_recent_played.length - 5);
	}

	this.request_game_licenses = function(pkg_id) {
		$.contextMenu('destroy', '#btn-play-with-license-' + pkg_id);
		var cmd = {
			action: 'game_licenses',
			version: 2,
			type: 'request',
			from: 'client',
			target: 'wss-server',
			data: {
				pkg_id: pkg_id
			}
		};
		CallFunction('WSSSEND ' + JSON.stringify(cmd));
	}

	this.game_licenses_sort = function(a, b) {
		var a_value = (a.license_status.toUpperCase() == 'FREE' ? 1 : 0);
		var b_value = (b.license_status.toUpperCase() == 'FREE' ? 1 : 0);

		return b_value - a_value;
	}

	this.process_wss_package = function(packet){
		if (packet.action != 'game_licenses')
			return false;

		$.contextMenu({
			selector: '#btn-play-with-license-' + packet.data.pkg_id,
			className: 'play-with-license-title',
			trigger: 'none',
			build: function($trigger, e) {
				e.preventDefault();

				var items = {};
				if (packet.data.licenses.length == 0)
					items['no_free_account'] = { name: translate_string('No free account'), disabled: true };

				if (packet.data.licenses.length > 0) {
					var show_licenses = packet.data.licenses.sort(that.game_licenses_sort);
					show_licenses.forEach(function (license) {
						items[license.license_account] = {
							name: license.license_account,
							disabled: (license.license_status.toUpperCase() != 'FREE'),
							icon: (license.license_status.toUpperCase() != 'FREE' ? 'fal fa-lock' : '')
						};
					});
				}

				return {
					callback: function(key, options) {
						theGameList.play_game(packet.data.pkg_id, thePCStatus.status_pc_token, 1, key);
					},
					items: items
				};
			}
		});

		$('#btn-play-with-license-' + packet.data.pkg_id).trigger('contextmenu');
		return true;
	}
}

function Shop()
{
	this.order_items = [];
	this.gift_order_items = [];
	this.filtered_items = [];
	this.loaded = false;
	this.current_group_id = -3;

	this.show = function() {
		$('#top-buttons .btn').removeClass('active');
		$('#top-buttons button[data-type=shop]').addClass('active');
		$('#more-games').html(translate_string('More games'));
		$('#games .container').hide();
		$('#games .shop-container').show();
		this.order_items = [];

		if (!this.loaded) {
			this.loaded = true;
			theProductGroupList.push({
				product_group_desc: "",
				product_group_has_icon: false,
				product_group_id: -2,
				product_group_name: translate_string("Gifts")
			});

			for (var i=0; i<theProductGroupList.length; i++)
			{
				if (theProductGroupList[i].product_group_id == -2) {
					var total = 0;
					theProductList.forEach(function(obj) {
						if (obj.product_coin_price > 0)
							total += 1;
					});
					theProductGroupList[i].product_count = total;
					continue;
				}

				var total = 0;
				theProductList.forEach(function(obj) {
					if (obj.product_group_id == theProductGroupList[i].product_group_id)
						total += 1;
				});
				theProductGroupList[i].product_count = total;
			}
		}

		$('#product-group-list ul').html(tmpl('tmpl-product-group', { items: theProductGroupList }));
		translate_obj($('#product-group-list ul'));
		this.change_group(-3); // all
		$('.shop-container [data-toggle="tooltip"]').tooltip();

		$('#cart_date').html(this.format_date());
		$('#cart').html(tmpl('tmpl-new-order-items', { items: [] }));
		$('#payment-table').html(tmpl('tmpl-payment-method'));

		translate_obj($('#cart_date'));
		translate_obj($('#cart'));
		translate_obj($('#payment-table'));

		if (typeof(theSettings.payment_method_balance) == 'undefined' || theSettings.payment_method_balance == 1)
			$('#payment_method_balance').prop('checked', true);

		if (typeof(theSettings.payment_method_credit_card) == 'undefined' || theSettings.payment_method_credit_card == 1)
			$('#payment_method_card').prop('checked', true);

		if (typeof(theSettings.payment_method_cash_in_client) == 'undefined' || theSettings.payment_method_cash_in_client == 1)
			$('#payment_method_cash').prop('checked', true);
	};

	// -2 = all
	this.change_group = function(group_id) {
		var that = this;
		that.current_group_id = group_id;
		$('#product-group-list li').removeClass('active');
		$('#product-group-list li[data-group=' + group_id + ']').addClass('active');

		if (group_id == -2) {
			$('#shop_cart').hide();
			$('#shop_cart_gift').show();
			this.gift_cart_refresh();
		}
		else {
			$('#shop_cart').show();
			$('#shop_cart_gift').hide();
			this.cart_refresh();
		}

		that.filtered_items = [];
		theProductList.forEach(function(obj) {
			if (group_id != -3)
			{
				if (group_id == -2 && parseFloat(obj.product_coin_price) <= 0)
					return;

				if (group_id != -2 && obj.product_group_id != group_id)
					return;
			}

			// don't show 0 stock
			if (obj.product_unlimited == 0 && obj.product_qty <= 0)
				return;

			if (obj.product_group_id == -1) {
				// pc group, member group
				var pc_group_id = (typeof(thePCStatus.pc_group_id) == 'undefined' ? 0 : thePCStatus.pc_group_id);
				var member_group_id = (typeof(thePCStatus.member_group_id) == 'undefined' ? 0 : thePCStatus.member_group_id);
				if (obj.product_pc_group != 0 && obj.product_pc_group != pc_group_id)
					return;

				if (obj.product_member_group != 0 && obj.product_member_group != member_group_id)
					return;

				// empty or "7|1|2|3|4|5|6"
				var todayAvailable = true;
				var yesterdayAvailable = true;
				var product_show_weekday = (typeof(obj.product_show_weekday) != 'undefined' ? obj.product_show_weekday : '');
				if (product_show_weekday.length > 0) {
					var weekdays = product_show_weekday.split('|');
					if (weekdays.indexOf(moment().format('E')) < 0)
						todayAvailable = false;
					if (weekdays.indexOf(moment().add(-1, 'days').format('E')) < 0)
						yesterdayAvailable = false;
					if (!todayAvailable && !yesterdayAvailable)
						return;
				}

				// empty or 00:00-24:00
				var product_show_time = (typeof(obj.product_show_time) != 'undefined' ? obj.product_show_time : '');
				if (product_show_time.length > 0) {
					var times = product_show_time.split('-');
					if (times.length != 2)
						return;

					var begin_times = times[0].split(':');
					var end_times = times[1].split(':');
					if (begin_times.length != 2 || end_times.length != 2)
						return;

					var begin = moment().set({ 'hour': parseInt(begin_times[0]), 'minute': parseInt(begin_times[1]), 'second': 0 });
					var end = moment().set({ 'hour': parseInt(end_times[0]), 'minute': parseInt(end_times[1]), 'second': 0 });
					if (end >= begin) {
						if (!todayAvailable)
							return;
						if (begin.isAfter() || end.isBefore())
							return;
					}

					// if like 23:00-08:00 over mid-night
					if (end < begin) {
						let isValid = ((begin.isBefore() && todayAvailable) || (yesterdayAvailable && end.isAfter()));
						if (!isValid)
							return;
					}
				}
			}

			that.filtered_items.push(obj);
		});

		$('#product-list').html(tmpl('tmpl-product', { items: that.filtered_items }));
		translate_obj($('#product-list'));
	};

	this.cart_refresh = function() {
		$('#cart').html(tmpl('tmpl-new-order-items', { items: this.order_items }));
		translate_obj($('#cart'));

		$('#new-order-clear').prop('disabled', this.order_items.length == 0);
		$('#new-order-done').prop('disabled', this.order_items.length == 0);

		var that = this;
		$('.new-order-item-qty').change(function() {
			var product_id = $(this).data('productid');
			var qty = $(this).val();
			qty = parseInt(qty);

			var product_item = null;
			theProductList.forEach(function(obj) {
				if (obj.product_id == product_id)
					product_item = obj;
			});
			if (product_item == null)
				return;

			if (isNaN(qty) || qty < 1)
				qty = 1;
			if (product_item.product_unlimited == 0 && qty > product_item.product_qty)
				qty = product_item.product_qty;

			that.order_items.forEach(function(obj) {
				if (obj.product_id == product_id) {
					obj.order_item_qty = qty;
					obj.order_item_money = obj.order_item_qty * obj.product_price;
					obj.order_tax = obj.order_item_qty * obj.product_tax;
					obj.money_after_discount = (obj.order_item_money * (100 - obj.member_group_discount_rate) /100).toFixed(2);
				}
			});

			that.cart_refresh();
		});

		$('.new-order-item-qty').keydown(function(event) {
			// Allow: delete,  backspace
			// Allow: home, end, left, right
			if (event.keyCode == 46 || event.keyCode == 8 || (event.keyCode >= 35 && event.keyCode <= 39)) {
				// let it happen, don't do anything
				return;
			}

			if (event.keyCode == 13) { // blur on enter
				$(this).blur();
				return;
			}

			// Ensure that it is a number and stop the keypress
			if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 ))
				event.preventDefault();
		});
	};

	this.cart_change_qty = function(product_id, qty) {
		var order_item = null;
		var product_item = null;

		theProductList.forEach(function(obj) {
			if (obj.product_id == product_id)
				product_item = obj;
		});
		if (product_item == null)
			return false;

		this.order_items.forEach(function(obj) {
			if (obj.product_id == product_id)
				order_item = obj;
		});

		if (order_item == null && qty > 0) {
			order_item = {
				product_id: product_id,
				product_name: product_item.product_name,
				product_tax_id: product_item.product_tax_id,
				product_tax: theTax.getTaxWithPrice(product_item.product_tax_id, product_item.product_price),
				product_price: theTax.getPriceWithTax(product_item.product_tax_id, product_item.product_price),
				order_item_qty: 0,
				order_item_money: 0,
				order_tax: 0,
				member_group_discount_rate: (typeof(thePCStatus.member_group_discount_rate) == 'undefined' || thePCStatus.member_group_discount_rate == null) ? 0 : thePCStatus.member_group_discount_rate,
				money_after_discount: 0
			};
			this.order_items.push(order_item);
		}
		if (order_item == null)
			return false;

		// delete product or dec qty
		var new_qty = order_item.order_item_qty + qty;
		if (new_qty <= 0) {
			for (var i=0; i<this.order_items.length; i++) {
				if (this.order_items[i].product_id == product_id) {
					this.order_items.splice(i, 1);
					break;
				}
			}
			this.cart_refresh();
		}

		for (var i=0; i<this.order_items.length; i++) {
			if (this.order_items[i].product_id == product_id) {
				this.order_items[i].order_item_qty = new_qty;
				this.order_items[i].order_item_money = this.order_items[i].order_item_qty * this.order_items[i].product_price;
				this.order_items[i].order_tax = this.order_items[i].order_item_qty * this.order_items[i].product_tax;
				this.order_items[i].money_after_discount = (this.order_items[i].order_item_money * (100 - this.order_items[i].member_group_discount_rate) /100).toFixed(2);
				break;
			}
		}

		this.cart_refresh();
		return false;
	};

	this.cart_clear = function() {
		this.order_items = [];
		this.cart_refresh();
	};

	this.cart_done = function() {

		var payment_method = 0;
		if ($('#payment_method_balance').length > 0 && $('#payment_method_balance').prop('checked'))
			payment_method = 1;
		if ($('#payment_method_card').length > 0 && $('#payment_method_card').prop('checked'))
			payment_method = 2;

		var items = [];
		this.order_items.forEach(function(obj) {
			items.push({
				product_id: obj.product_id,
				qty: obj.order_item_qty
			});
		});

		var cmd = {
			action: 'submit_order',
			version: 2,
			type: 'request',
			from: 'client',
			target: 'wss-server',
			data: {
				payment_method: payment_method,
				member_group_discount_rate: (typeof(thePCStatus.member_group_discount_rate) == 'undefined' || thePCStatus.member_group_discount_rate == null) ? 0 : thePCStatus.member_group_discount_rate,
				items: items
			}
		};

		CallFunction('WSSSEND ' + JSON.stringify(cmd));

	};

	this.gift_cart_refresh = function() {
		$('#gift_cart').html(tmpl('tmpl-new-order-gift-items', { items: this.gift_order_items }));
		translate_obj($('#gift_cart'));

		$('#new-order-gift-clear').prop('disabled', this.gift_order_items.length == 0);

		var that = this;
		$('.new-order-item-gift-qty').change(function() {
			var product_id = $(this).data('productid');
			var qty = $(this).val();
			qty = parseInt(qty);

			var product_item = null;
			theProductList.forEach(function(obj) {
				if (obj.product_id == product_id)
					product_item = obj;
			});
			if (product_item == null)
				return;

			if (isNaN(qty) || qty < 1)
				qty = 1;
			if (product_item.product_unlimited == 0 && qty > product_item.product_qty)
				qty = product_item.product_qty;

			that.gift_order_items.forEach(function(obj) {
				if (obj.product_id == product_id) {
					obj.order_item_qty = qty;
					obj.order_item_money = obj.order_item_qty * obj.product_coin_price;
				}
			});

			that.gift_cart_refresh();
		});

		$('.new-order-item-gift-qty').keydown(function(event) {
			if (event.keyCode == 46 || event.keyCode == 8 || (event.keyCode >= 35 && event.keyCode <= 39))
				return;

			if (event.keyCode == 13) {
				$(this).blur();
				return;
			}

			if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 ))
				event.preventDefault();
		});
	};

	this.gift_cart_change_qty = function(product_id, qty) {
		var order_item = null;
		var product_item = null;

		theProductList.forEach(function(obj) {
			if (obj.product_id == product_id)
				product_item = obj;
		});
		if (product_item == null)
			return false;

		this.gift_order_items.forEach(function(obj) {
			if (obj.product_id == product_id)
				order_item = obj;
		});

		if (order_item == null && qty > 0) {
			order_item = {
				product_id: product_id,
				product_name: product_item.product_name,
				product_coin_price: product_item.product_coin_price,
				order_item_qty: 0,
				order_item_money: 0
			};
			this.gift_order_items.push(order_item);
		}
		if (order_item == null)
			return false;

		// delete product or dec qty
		var new_qty = order_item.order_item_qty + qty;
		if (new_qty <= 0) {
			for (var i=0; i<this.gift_order_items.length; i++) {
				if (this.gift_order_items[i].product_id == product_id) {
					this.gift_order_items.splice(i, 1);
					break;
				}
			}
			this.gift_cart_refresh();
		}

		for (var i=0; i<this.gift_order_items.length; i++) {
			if (this.gift_order_items[i].product_id == product_id) {
				this.gift_order_items[i].order_item_qty = new_qty;
				this.gift_order_items[i].order_item_money = this.gift_order_items[i].order_item_qty * this.gift_order_items[i].product_coin_price;
				break;
			}
		}

		this.gift_cart_refresh();
		return false;
	};

	this.gift_cart_clear = function() {
		this.gift_order_items = [];
		this.gift_cart_refresh();
	};

	this.gift_cart_done = function(payment_method) {

		var items = [];
		this.gift_order_items.forEach(function(obj) {
			items.push({
				product_id: obj.product_id,
				qty: obj.order_item_qty
			});
		});

		var cmd = {
			action: 'submit_order',
			version: 2,
			type: 'request',
			from: 'client',
			target: 'wss-server',
			data: {
				payment_method: payment_method,
				member_group_discount_rate: 0,
				items: items
			}
		};

		CallFunction('WSSSEND ' + JSON.stringify(cmd));

	};

	this.format_date = function(time) {
		var WEEKs = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		var MONTHs = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		var d = new Date();
		if (typeof(time) != 'undefined' && time.length > 0) {
			var cols = time.split(' ');
			if (cols.length == 2) {
				var date_fields = cols[0].split('-');
				var time_fields = cols[1].split(':');
				if (date_fields.length == 3 && time_fields.length > 3)
					d = new Date(date_fields[0], date_fields[1], date_fields[2], time_fields[0], time_fields[1], time_fields[2]);
			}
		}
		return WEEKs[d.getDay() + 1].toUpperCase() + ", " + d.getDate() + " " + MONTHs[d.getMonth()+1].toUpperCase() + " " + (d.getYear() - 100);
	}
}

function Events()
{
	var that = this;
	this.events = [];
	this.event_last_refreshed = { timestamp: 0, event_id: '' };
	this.current_opened_event_id = '';
	this.gamecode2names = [
		{ code: 'fortnite', name: 'Fortnite' },
		{ code: 'dota2', name: 'Dota 2' },
		{ code: 'csgo', name: 'CS:GO' },
		{ code: 'valorant', name: 'Valorant' },
		{ code: 'lol', name: 'League of Legends' },
		{ code: 'all', name: 'Fortnite, Dota 2, Valorant, LOL' },
	];

	$('#event-banner').hide();
	$('#my-events-title').hide();
	$('#my-events').hide();
	$('#active-events-title').hide();
	$('#active-events').hide();

	this.reset = function() {
		$('#event-banner').hide();
		$('#my-events-title').hide();
		$('#my-events').hide();
		$('#active-events-title').hide();
		$('#active-events').hide();

		that.events = [];
		that.event_last_refreshed = { timestamp: 0, event_id: '' };
	}

	this.show = function() {
		that.current_opened_event_id = '';
		$('#top-buttons .btn').removeClass('active');
		$('#top-buttons button[data-type=events]').addClass('active');
		$('#more-games').html(translate_string('More games'));
		$('#games .container').hide();
		$('#games .events-container').show();
	}

	this.load_list = function() {
		CallFunction("API type=event-list&v=2&token=" + thePCStatus.status_pc_token);
	}

	this.refresh = function() {
		$('#spinner').show();
		if (that.event_last_refreshed.event_id == that.current_opened_event_id && moment().unix() - that.event_last_refreshed.timestamp < 30) {
			$('#spinner').hide();
			return;
		}
		setTimeout(function() {
			$('#spinner').hide();
		},2000);
		that.event_last_refreshed = { timestamp: moment().unix(), event_id: that.current_opened_event_id };

		if (that.current_opened_event_id.length == 0) {
			that.load_list();
			return;
		}

		CallFunction("API type=event-detail&v=2&event_id=" + that.current_opened_event_id + "&token=" + thePCStatus.status_pc_token);
	}

	this.open = function(event_id) {
		that.current_opened_event_id = event_id;
		var current_event = null;
		that.events.forEach(function(obj) {
			if (obj.event_id == event_id)
				current_event = obj;
		});

		that.build_event_detail_html(event_id);

		// If detail not load
		if (typeof(current_event.members) == 'undefined') {
			$('#spinner').show();
			setTimeout(function() {
				$('#spinner').hide();
			},2000);
			CallFunction("API type=event-detail&v=2&event_id=" + event_id + "&token=" + thePCStatus.status_pc_token);
		}
	}

	this.build_event_detail_html = function(event_id) {
		var current_event = null;
		that.events.forEach(function(obj) {
			if (obj.event_id == event_id)
				current_event = obj;
		});

		$('#games .event-detail-container .events').html(tmpl('tmpl-events', {events: [current_event], is_details_page: true}));
		$('#games .event-detail-container .event-buttons').html(tmpl('tmpl-event-buttons', {event: current_event}));
		$('#table-event-detail').html(tmpl('tmpl-event-detail', { event: current_event, members: (typeof(current_event.members) == 'undefined' ? [] : current_event.members) }));

		$('#games .container').hide();
		$('#games .event-detail-container').show();

		$('[data-toggle="tooltip"]').tooltip();
	}

	this.join_post = function() {
		if ($('#agreeTerms').is(":checked") == false) {
			sweetAlert(translate_string('Error'), translate_string('You must agree the terms of services before submitting.'), 'error');
			return;
		}

		var event_id = $('#joinEventForm input[name=event_id]').val();
		$('.myModalJoinEvent').modal('hide');
		$('#spinner').show();
		setTimeout(function() {
			$('#spinner').hide();
		},2000);
		CallFunction("API type=event-join&v=2&event_id=" + event_id + "&token=" + thePCStatus.status_pc_token + '&home=' + (theIsHomeVersion ? 1 : 0));
	}

	this.join = function(event_id) {
		var current_event = null;
		that.events.forEach(function(obj) {
			if (obj.event_id == event_id)
				current_event = obj;
		});

		if (current_event == null)
			return;

		if (typeof(current_event.emember_member_account) != 'undefined' || current_event.event_status == 'past')
			return;

		$('#joinEventForm input[name=event_id]').val(event_id);
		$('.myModalJoinEvent').modal('show');
	}

	this.play = function(event_id) {
		var current_event = null;
		that.events.forEach(function(obj) {
			if (obj.event_id == event_id)
				current_event = obj;
		});

		if (current_event == null)
			return;

		if (typeof(current_event.emember_member_account) == 'undefined' && current_event.event_status != 'past') {
			that.join(event_id);
			return;
		}

		if (typeof(current_event.event_play_command) == 'undefined' || current_event.event_play_command.length == 0)
			return;

		CallFunction("RUN " + current_event.event_play_command);
	}

	this.build_event_list_html = function() {
		var event_banner = null;
		for (var i=0; i<that.events.length; i++) {
			that.events[i].event_status = 'active';
			if (moment(that.events[i].event_end_time_local).isBefore())
				that.events[i].event_status = 'past';
			if (moment(that.events[i].event_start_time_local).isAfter())
				that.events[i].event_status = 'upcoming';

			that.gamecode2names.forEach(function(game) {
				if (that.events[i].event_game_code == game.code) {
					that.events[i].game_name = game.name;
				}
			});

			if (that.events[i].event_in_banner)
				event_banner = that.events[i];
		}

		var my_events = [];
		var active_events = [];
		that.events.forEach(function(item) {
			if (typeof(item.emember_id) != 'undefined')
				my_events.push(item);
			if (typeof(item.emember_id) == 'undefined' && item.event_status == 'active')
				active_events.push(item);
		});

		my_events.sort((a, b) => {
			let a_status_score = 0;
			let b_status_score = 0;
			if (a.event_status === 'active')
				a_status_score = 2;
			if (a.event_status === 'upcoming')
				a_status_score = 1;
			if (b.event_status === 'active')
				b_status_score = 2;
			if (b.event_status === 'upcoming')
				b_status_score = 1;
			if (a_status_score != b_status_score)
				return b_status_score - a_status_score;

			if (moment(a.event_start_time_local).isBefore(moment(b.event_start_time_local)))
				return 1;
			return -1;
		})

		$('#event-banner').hide();
		$('#event-banner').removeClass('event-banner-fortnite');
		$('#event-banner').removeClass('event-banner-valorant');
		$('#event-banner').removeClass('event-banner-dota2');
		$('#event-banner').removeClass('event-banner-csgo');
		$('#event-banner').removeClass('event-banner-lol');
		$('#my-events-title').hide();
		$('#my-events').hide();
		$('#active-events-title').hide();
		$('#active-events').hide();

		if (event_banner != null) {
			$('#event-banner').html(tmpl('tmpl-event-banner', {event: event_banner}));
			$('#event-banner').addClass('event-banner-' + event_banner.event_game_code);
			$('#event-banner').show();
		}

		if (my_events.length > 0) {
			$('#my-events').html(tmpl('tmpl-events', {events: my_events, is_details_page: false}));
			$('#my-events-title').show();
			$('#my-events').show();
		}

		if (active_events.length > 0) {
			$('#active-events').html(tmpl('tmpl-events', {events: active_events, is_details_page: false}));
			$('#active-events-title').show();
			$('#active-events').show();
		}

		$('[data-toggle="tooltip"]').tooltip();
	}

	this.rank_baseurl = function() {
		var rank_baseurl = 'https://rank.icafecloud.com';
		if (typeof(theCafe.rank_baseurl) != 'undefined')
			rank_baseurl = theCafe.rank_baseurl;
		return rank_baseurl;
	}

	this.onAPIResponse = function(api_action, response) {
		$('#spinner').hide();
		if (response.result == 0) {
			sweetAlert(translate_string('Error'), translate_string(response.message), 'error');
			return;
		}

		if (api_action.indexOf('type=event-list') >= 0) {
			that.events = response.events;
			that.build_event_list_html();
			return;
		}

		if (api_action.indexOf('type=event-detail') >= 0) {
			for (var i=0; i<that.events.length; i++) {
				if (that.events[i].event_id == response.event.event_id) {
					that.events[i] = response.event;

					that.events[i].event_status = 'active';
					if (moment(that.events[i].event_end_time_local).isBefore())
						that.events[i].event_status = 'past';
					if (moment(that.events[i].event_start_time_local).isAfter())
						that.events[i].event_status = 'upcoming';

					that.gamecode2names.forEach(function(game) {
						if (that.events[i].event_game_code == game.code) {
							that.events[i].game_name = game.name;
						}
					});

					// If current member record need push to members end
					if (that.events[i].members.length > 0 && that.events[i].emember_id && that.events[i].emember_rank > that.events[i].members[that.events[i].members.length-1].emember_rank) {
						that.events[i].members.push({
							emember_id: that.events[i].emember_id,
							emember_member_account: that.events[i].emember_member_account,
							emember_rank: that.events[i].emember_rank,
							emember_matches: that.events[i].emember_matches,
							emember_point_matches: that.events[i].emember_point_matches,
							emember_bonus: that.events[i].emember_bonus,
							emember_point: that.events[i].emember_point,
							emember_wins: that.events[i].emember_wins,
							emember_kills: that.events[i].emember_kills,
							emember_assists: that.events[i].emember_assists,
							emember_deaths: that.events[i].emember_deaths,
							emember_lasthits: that.events[i].emember_lasthits,
							license_country: that.events[i].license_country,
							license_icafename: that.events[i].license_icafename
						});
					}
					break;
				}
			}

			that.build_event_list_html();
			that.build_event_detail_html(response.event.event_id);
			return;
		}

		if (api_action.indexOf('type=event-join') >= 0) {
			if (response.result == 0) {
				sweetAlert(translate_string('Error'), translate_string(response.message), 'error');
				return;
			}

			that.event_last_refreshed = { timestamp: 0, event_id: '' };
			that.refresh();
			return;
		}
	}

}

function ConvertToMember()
{
	this.init = function() {
		$('#convert-to-member-button').hide();
		let license_convert_to_member_enable = typeof(theSettings.license_convert_to_member_enable) != 'undefined' ? theSettings.license_convert_to_member_enable : 0;
		if (license_convert_to_member_enable && is_logined() && (thePCStatus.member_group_id === MEMBER_GROUP_GUEST || thePCStatus.member_group_id === MEMBER_GROUP_PREPAID || thePCStatus.member_group_id === MEMBER_GROUP_OFFER))
			$('#convert-to-member-button').show();
	}

	this.show = function() {
		$("#form-convert-member input[name=account]").val('');
		$("#form-convert-member input[name=birthday]").val('');
		$("#form-convert-member input[name=password]").val('');
		$("#form-convert-member input[name=confirm_password]").val('');
		$("#form-convert-member input[name=first_name]").val('');
		$("#form-convert-member input[name=last_name]").val('');
		$("#form-convert-member input[name=phone]").val('');
		$("#form-convert-member input[name=email]").val('');
		$('#form-convert-member button[type="submit"]').prop('disabled', false);
		$('.myModalConvertMember').modal('show');

		// setting the required prop for each required field
		if(typeof(theSettings.member_settings) != 'undefined')
		{
			var member_settings = JSON.parse(theSettings.member_settings);

			$('#form-convert-member input[name=account]').prop('required', member_settings.member_account == 1);
			$('#form-convert-member input[name=first_name]').prop('required', member_settings.member_first_name == 1);
			$('#form-convert-member input[name=last_name]').prop('required', member_settings.member_last_name == 1);
			$('#form-convert-member input[name=password]').prop('required', member_settings.member_password == 1);
			$('#form-convert-member input[name=confirm_password]').prop('required', member_settings.member_password == 1);
			$('#form-convert-member input[name=member_expire_time_local]').prop('required', member_settings.member_expire_time_local == 1);
			$('#form-convert-member input[name=birthday]').prop('required', member_settings.member_birthday == 1);
			$('#form-convert-member input[name=phone]').prop('required', member_settings.member_phone == 1);
			$('#form-convert-member input[name=email]').prop('required', member_settings.member_email == 1);

			$('#form-convert-member').find('input').each(function () {
				if($(this).prop('required')){
					$(this).parents().children('label').addClass('required');
				}
			});
		}
	}

	this.submit = function() {
		var account = $("#form-convert-member input[name=account]").val();
		var birthday = $("#form-convert-member input[name=birthday]").val();
		var password = $("#form-convert-member input[name=password]").val();
		var confirm_password = $("#form-convert-member input[name=confirm_password]").val();
		var first_name = $("#form-convert-member input[name=first_name]").val();
		var last_name = $("#form-convert-member input[name=last_name]").val();
		var phone = $("#form-convert-member input[name=phone]").val();
		var email = $("#form-convert-member input[name=email]").val();

		if(account.length === 0) {
			sweetAlert(translate_string("Error"), translate_string("Account can not be empty!"), "error");
			return false;
		}
		if(password.length === 0) {
			sweetAlert(translate_string("Error"), translate_string("Password can not be empty!"), "error");
			return false;
		}
		if(confirm_password.length === 0 || password != confirm_password) {
			sweetAlert(translate_string("Error"), translate_string("The new password and confirm password do not match!"), "error");
			return false;
		}
		if(first_name.length === 0) {
			sweetAlert(translate_string("Error"), translate_string("First name can not be empty!"), "error");
			return false;
		}
		if(last_name.length === 0) {
			sweetAlert(translate_string("Error"), translate_string("Last name can not be empty!"), "error");
			return false;
		}

		$('#form-convert-member button[type="submit"]').prop('disabled', true);
		$('#spinner').show();

		var cmd = {
			action: 'convert_to_member',
			version: 2,
			type: 'request',
			from: 'client',
			target: 'wss-server',
			data: {
				account: account,
				birthday: birthday,
				password: password,
				first_name: first_name,
				last_name: last_name,
				phone: phone,
				email: email
			}
		};

		CallFunction('WSSSEND ' + JSON.stringify(cmd));
	}

	this.process_wss_package = function(packet) {
		if (packet.action != 'convert_to_member')
			return false;

		$('#spinner').hide();
		$('#form-convert-member button[type="submit"]').prop('disabled', false);

		if (packet.status == 'error') {
			sweetAlert(translate_string("Error"), translate_string(packet.data.message), "error");
			return;
		}

		$('.myModalConvertMember').modal('hide');
		return true;
	}
}

var theConvertToMember = new ConvertToMember();

function Video()
{
	var that = this;
	
	this.stop = function(type)
	{
		var el = document.querySelector('#'+type);
		el.setAttribute('src', '');
		if(type == 'url-video')
			document.querySelector('.'+type).load();
		return;
		/*
		if(type == 'url-video')
		{
			var el = document.querySelector('.'+type)	
			el.pause();
			el.currentTime = 0;
			return;
		}
		
			
		if(type == 'youtube-video')
		{	
			var el = document.querySelector('.'+type);
			var iframe = document.getElementById('youtube-video');
			var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
			if (  iframeDoc.readyState  == 'complete' ) {			
				iframe.contentWindow.onload = function(){
					el[0].contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
				}
				return
			}
			return;
		}
		*/
	}
	
	this.play = function(type, source, mute){
		var el = document.querySelector('.'+type)
		el.classList.toggle('d-none');
		var target = document.querySelector('.'+type+' #'+type);
		
		if(type == 'youtube-video')
		{
			that.stop('url-video');
			target.setAttribute('src' , "https://www.youtube.com/embed/"+source+"?mute="+mute+"&modestbranding=1&autohide=1&showinfo=0&controls=0&autoplay=1&loop=1&playlist="+source+"&version=3");
		}
		
		if(type == 'url-video')
		{
			that.stop('youtube-video');
			// "file:///E:/Internet%20Tools/iCafeMenu/html/videos/ad.webm"
			target.setAttribute('src', source);
			el.load();
			el.play();
		}
	}	
}

//var theVideo = new Video();
//theVideo.play('youtube-video', 'TJKTcGLfc7s', 1);
//theVideo.play('url-video', 'videos/video1.webm', 1);
var thePCInfo = {
   "pc_name" : "",
   "pc_turn_off_monitor_seconds" : 0,
   "version_date": ""
}

function set_monitor_turn_off_timeout(seconds)
{
	if (theMonitorTurnOffIntervalId != null) 
	{
		clearInterval(theMonitorTurnOffIntervalId);
		theMonitorTurnOffIntervalId = null;
	}

	if(seconds == 0)
		return;
	
	theMonitorTurnOffStartTime = new Date();
	theMonitorTurnOffIntervalId = setInterval(function() {

		if (new Date() - theMonitorTurnOffStartTime < seconds * 1000)
			return;

		theMonitorTurnOffStartTime = new Date();
		theMonitorTurnOffStartTime.setFullYear(2050,1,1);
		CallFunction("MONITOR OFF");

	}, 10000);
}