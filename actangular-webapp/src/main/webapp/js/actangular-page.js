(function() {'use strict';

/* agPage */

angular.module('agPage', [])
.factory('ListPage', function ($q, $location){
	return {
		from: 0,
		to: 0,
		total: 0,
		hasPrevious: false,
		hasNext: false,
		previous : function (options){
			if(this.hasPrevious === true){
				this.requestParam.start = this.requestParam.start - this.listSize;
				if(this.requestParam.start < 0)
					this.requestParam.start = 0;
				this.refresh(true);
			}
		},
		next : function (options){
			if(this.hasNext === true){
				this.requestParam.start = this.requestParam.start + this.listSize;
				this.refresh(true);
			}
		},			
		refresh : function (navigated, success, fail){
			var me = this;
			this.queryList(this.requestParam, 
					function (data){
						//if no items in current page navigate back
						if(data.total > 0 && data.size === 0){
							var newStart = (data.total - (data.total % me.listSize));
							if(newStart === data.total)
								newStart = data.total - me.listSize;
							me.requestParam.start = newStart;
							me.refresh(navigated, success, fail);
							return;
						}
						me.list = data;
						me.total = data.total;
						me.from = me.requestParam.start + 1;
						me.to = me.requestParam.start + me.listSize;
						me.hasPrevious = me.requestParam.start > 0;
						me.hasNext = ((me.requestParam.start + me.listSize) < me.total);
						
						if(me.sortKeys)
							me.sortKey = me.sortKeys[me.requestParam.sort] || me.requestParam.sort;
						if(success)
							success(data);
						if(navigated)
							me.scollList();
					},
					function (response){
						if(fail)
							fail(response);
					}
			);
		},
		sortBy : function (paramId){
			this.requestParam.sort = paramId;
			
			this.requestParam.start = 0;
			this.refresh(true);
		},	
		toggleOrder : function (){
			if(this.requestParam.order === 'asc') this.requestParam.order = 'desc';
			else this.requestParam.order = 'asc';
			this.requestParam.start = 0;
			this.refresh(true);
		},
		scollList: function (){
			var listElm = document.getElementById('list');
			if(listElm)
				listElm.scrollTop = 0;
		},
		show: function(itemId){
			if(itemId){
				return this.showItem(itemId);
			}else{
				return this.showList();
			}
		},
		showItem: function(itemId){
			var item = this.getItem(itemId);
			if(item) {
				this[this.itemName] = item;
				this.controlsTemplate = this.itemControlsTemplate;
				this.showingItem = true;
				return this;
			}
			var deferred = $q.defer();
			var me = this;
			
			this.queryOne(itemId, function(item){
				me[me.itemName] = item;
				me.controlsTemplate = me.itemControlsTemplate;
				me.showingItem = true;
				deferred.resolve(me);
			}, function(response){
				deferred.reject();
				me.back(true);
			});
			return deferred.promise;
		},
		getItem: function(itemId){
			return this.cache.get(itemId);
		},
		queryOne: function(itemId, success, fail){
			return this.queryResource.one(itemId).get().then(success, fail);
		},
		queryList: function(requestParam, success, fail){
			return this.queryResource.getList(requestParam).then(success, fail);
		},
		showList: function(){
			if(this.list) {
				this.controlsTemplate = this.listControlsTemplate;
				this.showingItem = false;
				this.refresh();
				return this;
			}
			var deferred = $q.defer();
			var me = this;
			this.refresh(false, function(){
				me.controlsTemplate = me.listControlsTemplate;
				me.showingItem = false;
				deferred.resolve(me);
			});
			return deferred.promise;
		},
		back: function(replace){
			var path = $location.path();
			$location.path(path.substring(0, path.lastIndexOf("/")));
			if(replace)
				$location.replace();
		},
		onPageShow: function(){
		}
	};
})
.directive('agItemPage', function($templateCache, $compile) {
	return{
		restrict: 'ECA',
	    priority: -400,
		link: function(scope, element, attrs) {
			function updatePage(page){
					 if(page && page.showingItem === true && page.itemTemplate){
						 element.html($templateCache.get(page.itemTemplate));
						 var link = $compile(element.contents());
						 link(scope);
					 }
			};
			 scope.$watch(attrs.agItemPage, updatePage);
				 
			 scope.$on('pageUpdateStart', function(event, page){
				 updatePage(page); 
			 });
	}};
})
.directive('agPage', function($route) {
	return function (scope, element, attr){
		
		function updatePage(){
			if($route.current && $route.current.locals){
				var page = $route.current.locals.page || {};

				var previousPage = scope.page, eventType = "pageChange";
				if(previousPage === page){
					eventType = "pageUpdate";
				}
				scope.$broadcast(eventType+'Start', page, previousPage);
				scope.page = page;
				scope.$broadcast(eventType+'Success', page, previousPage);
			}
		};
		scope.$on('$routeChangeSuccess', updatePage);
		updatePage();
	};
})
.directive('agPageScroll', function($animate) {
	return function (scope, element, attr){
		scope.$watch(attr.agPageScroll, function (page){
				element.scrollTop(0);
		    });
	};
});

})();