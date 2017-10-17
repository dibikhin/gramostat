/// Gramostat
///
/// TODO Use "use strict", Object.freeze, lambdas, Pure functions, generators&iterators, modules
///
/// Sample usage:
// var import_script = (function (oHead) {
// 	function loadError(oError) {
// 		throw new URIError("The script " + oError.target.src + " is not accessible.");
// 	}

// 	function fOnload() { console.log('The script loaded.'); }

// 	return function (sSrc) {
// 		console.log('Loading the script...');

// 		var oScript = document.createElement("script");
// 		oScript.type = "text\/javascript";
// 		oScript.onerror = loadError;
// 		oScript.onload = fOnload;
// 		oHead.appendChild(oScript);
// 		oScript.src = sSrc;
// 	};

// })(document.head || document.getElementsByTagName("head")[0]);

// import_script('https://dibikhin.github.io/gramostat/gramostat.js');
// var today_followers = Gramostat.export_followers(510162439);
// Gramostat.stats(yesterday_followers, today_followers);

(function () {
	function test() {
		console.log('Tested ok.');
	}

	// from https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement#Dynamically_importing_scripts
	var _import_script = (function (oHead) {
		function loadError(oError) {
			throw new URIError("The script " + oError.target.src + " is not accessible.");
		}

		function fOnload() { console.log('The script loaded.'); }

		return function (sSrc) {
			console.log('Loading the script...');

			var oScript = document.createElement("script");
			oScript.type = "text\/javascript";
			oScript.onerror = loadError;
			oScript.onload = fOnload;
			oHead.appendChild(oScript);
			oScript.src = sSrc;
		};

	})(document.head || document.getElementsByTagName("head")[0]);

	// TODO: compare by id
	function stats(yesterday_followers, today_followers) {
		console.log('Computing stats...');

		var today_followers_names = _.map(today_followers, function (item) { return item.node.username; });
		var yesterday_followers_names = _.map(yesterday_followers, function (item) { return item.node.username; });

		var intersection = _.intersection(yesterday_followers_names, today_followers_names);
		var unsubscribed = _.difference(yesterday_followers_names, intersection);
		var subscribed = _.difference(today_followers_names, intersection);

		console.log('Stats computed.');

		return {
			today_followers_qty: today_followers_names.length,
			yesterday_followers_qty: yesterday_followers_names.length,
			subscribed_qty: subscribed.length,
			unsubscribed_qty: unsubscribed.length,
			followers_growth: subscribed.length - unsubscribed.length,
			subscribed: subscribed,
			unsubscribed: unsubscribed
		};
	}

	// Gramostat.fetch_common_followers(323124269, 510162439) // 323124269 - Тома , 510162439 - Алена)
	/// returns [{}]
	function fetch_common_followers(id_one, id_two) {
		var id_one_followers = export_followers(id_one);
		var id_two_followers = export_followers(id_two);

		var id_one_followers_names = _.map(id_one_followers, function (item) { return item.node.username; });
		var id_two_followers_names = _.map(id_two_followers, function (item) { return item.node.username; });

		return _.intersection(id_one_followers_names, id_two_followers_names);

		// fetch_common_followers(export_followers(id_one), export_followers(id_two))
		// function to_usernames(items) { return _.map(items, item = > return item.node.username); }
		// return _.intersection(
		//		to_names(followers_one),
		// 		to_names(followers_two));
	}

	// Gramostat.export_followers(323124269)
	function export_followers(id) {
		var base_url = '/graphql/query/?query_id=17851374694183129&variables={"id":' + id + ',"first":1000}';
		var followers = [];
		var page_info = null;

		console.log('Starting to load...');

		var resp_data = _getSync(base_url);
		console.log('First batch loaded.');

		followers = followers.concat(resp_data.data.user.edge_followed_by.edges);
		console.log(followers.length);
		page_info = resp_data.data.user.edge_followed_by.page_info;

		while (page_info.has_next_page) {
			var next_url =
				'/graphql/query/?query_id=17851374694183129&variables={"id":' + id + ',"first":1000,"after":"'
				+ page_info.end_cursor + '"}';

			var next_resp_data = _getSync(next_url);
			var new_nodes = next_resp_data.data.user.edge_followed_by.edges;

			console.log('Next batch loaded.');
			console.log(new_nodes.length);

			followers = followers.concat(new_nodes);
			page_info = next_resp_data.data.user.edge_followed_by.page_info;
		}

		return followers;
	}

	// https://www.instagram.com/dibikhin/?__a=1

	function _getSync(url) {
		var result = null;
		jQuery.ajax({
			async: false,
			url: url,
			success: function (data) {
				result = data;
			},
			error: function () {
				console.log('error');
			}
		});
		return result;
	}

	console.log('Loading...');

	_import_script("https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js");
	_import_script("https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js");

	Gramostat = {
		fetch_common_followers: fetch_common_followers,
		export_followers: export_followers,
		stats: stats,
		test: test
	};
	console.log('Loaded!');
})();
