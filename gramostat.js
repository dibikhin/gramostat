/// Gramostat
///
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

// import_script('https://dibikhin.github.io/gramostat/gramostat.js?v=' + Date.now());
// var today_followers = Gramostat.export_followers(510162439);
// Gramostat.followers_stats(yesterday_followers, today_followers);

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

	function followers_stats(yesterday_followers, today_followers) {
		console.log('Computing stats...');

		var today_followers_names = _followers_to_usernames(today_followers);
		var yesterday_followers_names = _followers_to_usernames(yesterday_followers);

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

	/**
	 * Converts followers to usernames
	 * 
	 * @param {object[]} followers Followers
	 * @returns {string[]} Usernames of followers
	 */
	function _followers_to_usernames(followers) {
		return _.map(followers, item => item.node.username);
	}

	/**
	 * Finds common followers' usernames
	 * 
	 * @param {object[]} followers Followers list one
	 * @param {object[]} other_followers Followers list two
	 * @returns {string[]} Usernames of followers
	 */
	function find_common_followers(followers, other_followers) {
		return _.intersection(
			_followers_to_usernames(followers),
			_followers_to_usernames(other_followers));
	}

	/**
	 * Fetches followers and find common ones
	 * Gramostat.fetch_common_followers(323124269, 510162439) // 323124269 - Тома , 510162439 - Алена)
	 * 
	 * @param {number} user_id User Id
	 * @param {number} other_user_id User Id
	 * @returns {string[]} Usernames of followers
	 */
	function fetch_common_followers(user_id, other_user_id) {
		return find_common_followers(
			export_followers(user_id),
			export_followers(other_user_id));
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

	/**
	 * Gets user by username
	 * 
	 * Uses https://www.instagram.com/dibikhin/?__a=1
	 * 
	 * @param {String} username 
	 * @returns {Object} User
	 */
	function get_user_by_username(username) {
		return _getSync('https://www.instagram.com/' + username + '/?__a=1');
	}

	/**
	 * Compute community reachability by followings qty
	 * 
	 * Category range: from Unreachable (2K+) to Very reachable (<100)
	 * 
	 * @param {object} user User 
	 * @returns {string} Category
	 */
	function reachability(user) {
		return 'nope';
	}

	/**
	 * ***NOT PURE***
	 * 
	 * Fetches users and computes grouped stats of influence
	 * 
	 * influence_stats(dri_fols_stats_201017.subscribed);
	 * 
	 * @param {string[]} usernames Usernames
	 * @returns {object[]} Grouped by category users' stats
	 */
	function influence_stats(usernames) {
		console.log('Influence stats loading...');

		var stats = _.map(usernames, function (username) {
			return {
				username: username,
				influence: _influence(get_user_by_username(username))
			};
		});

		console.log('Influence stats loaded.');

		return _.groupBy(stats, user_stats => user_stats.influence);
	}

	/**
	 * ***NOT PURE***
	 * 
	 * Fetches users and computes grouped stats of activity
	 * 
	 * activity_stats(dri_fols_stats_201017.subscribed);
	 * 
	 * @param {string[]} usernames Usernames
	 * @returns {object[]} Grouped by category users' stats
	 */
	function activity_stats(usernames) {
		console.log('Activity stats loading...');

		var stats = _.map(usernames, function (username) {
			return {
				username: username,
				activity: _activity(get_user_by_username(username))
			};
		});

		console.log('Activity stats loaded.');

		return _.groupBy(stats, user_stats => user_stats.activity);
	}

	/**
	* ***NOT PURE***
	* 
	* Fetches users and computes grouped stats of quality
	* 
	* quality_stats(dri_fols_stats_201017.subscribed);
	* 
	* @param {string[]} usernames Usernames
	* @returns {object[]} Grouped by category users' stats
	*/
	function quality_stats(usernames) {
		console.log('Quality stats loading...');
		var users = _.map(usernames, get_user_by_username);
		console.log('Quality stats loaded.');

		return _quality_stats(users);
	}

	function _quality_stats(users) {
		var _users = _.filter(users, function (user) { return !!user && !!user.graphql && !!user.graphql.user });
		var stats = _.map(_users, function (user) {
			return {
				username: user.graphql.user.username,
				biography: user.graphql.user.biography,
				full_name: user.graphql.user.full_name,
				quality: _quality(user),
				influence: _influence(user),
				activity: _activity(user)
			};
		});
		return _.groupBy(stats, user_stats => user_stats.quality);
	}

	/**
	 * Compute user's influence by followers to following ratio.
	 * Absolute followers' qty ignored.
	 * 
	 * Category range: from Mass follower (<=0.5) to Influener (40+).
	 * 
	 * @param {object} user User
	 * @returns {string} Category
	 */
	function _influence(user_info) {
		if (!user_info || !user_info.graphql || !user_info.graphql.user
			|| !user_info.graphql.user.edge_followed_by || !user_info.graphql.user.edge_follow
			|| user_info.graphql.user.edge_followed_by.count < 1 || user_info.graphql.user.edge_follow.count < 1) {
			return 'N/A';
		}

		var user = user_info.graphql.user;
		var followers_ratio = user.edge_followed_by.count / user.edge_follow.count;

		if (followers_ratio <= 0.25) {
			return 'Spammer';			
		} else if (followers_ratio <= 0.5) {
			return 'Mass follower';
		} else if (followers_ratio <= 1) {
			return 'Low popularity';
		} else if (followers_ratio <= 2) {
			return 'Regular';
		} else if (followers_ratio <= 5) {
			return 'Popular';
		} else if (followers_ratio < 40) {
			return 'Rising star';
		} else {
			return 'Influencer';
		}
	}

	/**
	* Compute absolute user's activity by total media qty.
	* Last activity doesn't matter.
	* 
	* Category range: from Inactive (0) to Power users (1000+).
	* 
	* @param {object} user User
	* @returns {string} Category
	*/
	function _activity(user_info) {
		if (!user_info || !user_info.graphql || !user_info.graphql.user
            || !user_info.graphql.user.edge_owner_to_timeline_media || user_info.graphql.user.edge_owner_to_timeline_media.count < 0) {
			return 'N/A';
		}

		var media_count = user_info.graphql.user.edge_owner_to_timeline_media.count;

		if (media_count === 0) {
			return 'Inactive';
		} else if (media_count < 50) {
			return 'Low activity';
		} else if (media_count < 100) {
			return 'Active';
		} else if (media_count < 500) {
			return 'Very active';
		} else if (media_count < 1000) {
			return 'Power user';
		} else {
			return 'Maniac';
		}
	}

    /**
	* Compute user's quality by absolute media, followers, followings qtys
	* 
	* Category range: from Poor (Zeros) to Excellent (All high).
	* 
	* @param {object} user User
	* @returns {string} Category
	*/
	function _quality(user_info) {
		function _proportions(user) {
			// posts a little by follows or followed by many
			//if(user.edge_owner_to_timeline_media.count < 60 && (user.edge_followed_by.count > 200 || user.edge_follow.count > 200)) {
			//	return 'Suspicious';
			//}
			const followers_rate = user.edge_follow.count / user.edge_followed_by.count
			if (followers_rate >= 2 && followers_rate < 4) {
				return 'Suspicious';
			}
			if (followers_rate >= 4) {
				return 'Dirty';
			}
			return 'Other';
		}

		if (!user_info || !user_info.graphql || !user_info.graphql.user 
		    || !user_info.graphql.user.edge_owner_to_timeline_media
		    || user_info.graphql.user.edge_owner_to_timeline_media.count < 0
		    || !user_info.graphql.user.edge_followed_by || !user_info.graphql.user.edge_follow
		    || user_info.graphql.user.edge_followed_by.count < 0 || user_info.graphql.user.edge_follow.count < 0) {
			return 'N/A';
		}

		var user = user_info.graphql.user;
		var qtys = [user.edge_owner_to_timeline_media.count, user.edge_followed_by.count, user.edge_follow.count];

		var threshold = x => x < 5;
		const bad_proportions = { 'Dirty': true, 'Suspicious': true };

		if (_.all(qtys, threshold)) {
			return 'Exactly bot';
		} else if (_.any([user.edge_owner_to_timeline_media.count], threshold) && _proportions(user) in bad_proportions) {
			return 'Exactly bot';
		} else if (_.all([user.edge_followed_by.count, user.edge_follow.count], threshold)) {
			return 'Almost bot';
		} else if (_.all([user.edge_owner_to_timeline_media.count, user.edge_followed_by.count], threshold)) {
			return 'Almost bot';
		} else if (_.all([user.edge_owner_to_timeline_media.count, user.edge_follow.count], threshold)) {
			return 'Almost bot';
		} else if (_proportions(user) === 'Dirty') {
			return 'Almost bot'
		} else if (_proportions(user) === 'Suspicious') {
			return 'Maybe bot'
		} else if (_.any(qtys, threshold)) {
			return 'Maybe bot';
		} else {
			return 'Almost human';
		}
	}

	// https://www.instagram.com/knl_100/?__a=1 -> 404
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
		find_common_followers: find_common_followers,
		export_followers: export_followers,
		followers_stats: followers_stats,
		get_user_by_username: get_user_by_username,
		influence_stats: influence_stats,
		activity_stats: activity_stats,
		quality_stats: quality_stats,
		test: test
	};
	console.log('Loaded!');
})();

// var dri_fols_251017 = Gramostat.export_followers(510162439);
// var dri_fols_stats_251017 = Gramostat.followers_stats(dri_fols_241017, dri_fols_251017);
// var dri_fols_infl_25 = Gramostat.influence_stats(dri_fols_stats_251017.subscribed);
// var dri_fols_qual_25 = Gramostat.quality_stats(dri_fols_stats_251017.subscribed);

// var epi_fols_241017 = Gramostat.export_followers(6196065610);
// var epi_fols_241017_names = _.map(epi_fols_241017, item => item.node.username);
// var epi_fols_hum_24 = Gramostat.humanity_stats(epi_fols_241017_names);

// TODO everyday run: export, stats
// TODO combined activity and influence stats
// TODO stats(): compare objects w/ mixin Underscore's createIndexFinder with _.isEqual
// TODO extract_migrated_followers()
// TODO reachability_stats()

// TODO add _.memoize and cache reloading
// TODO add _.throttle by hours for care with Instagram limits

// TODO store history to Firebase

// TODO assign Gramostat in place
// TODO group functions in submodules Gramostat.Util, Gramostat.Data, Gramostat.Stats
// TODO inject deps: underscore, jQuery
// TODO mark private/public members

// TODO Use "use strict", Object.freeze, lambdas, Pure functions, generators&iterators, modules
