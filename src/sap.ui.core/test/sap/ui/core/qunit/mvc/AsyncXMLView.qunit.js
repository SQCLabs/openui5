sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/cache/CacheManager",
	"sap/ui/core/Component",
	"sap/ui/core/mvc/View",
	"sap/ui/core/mvc/XMLView",
	"./testdata/TestPreprocessor",
	"./AnyViewAsync.qunit",
	"jquery.sap.script"
], function(jQuery, Cache, Component, View, XMLView, TestPreprocessor, asyncTestsuite /*, jQuery*/) {

	// setup test config with generic factory
	var oConfig = {
		type : "XML",
		receiveSource : function(source) {
			return new XMLSerializer().serializeToString(source);
		}
	};

	// set generic view factory
	oConfig.factory = function(bAsync) {
		return sap.ui.view({
			type : "XML",
			viewName : "testdata.mvc.Async",
			async : bAsync
		});
	};
	asyncTestsuite("Generic View Factory", oConfig);

	// set XMLView factory
	oConfig.factory = function(bAsync) {
		return sap.ui.xmlview({
			viewName : "testdata.mvc.Async",
			async : bAsync
		});
	};
	asyncTestsuite("XMLView Factory", oConfig);

	// ==== Cache-relevant test cases ===================================================

	function viewFactory(mCacheSettings, mPreprocessors) {
		return sap.ui.xmlview({
			viewName: "testdata.mvc.cache",
			async: true,
			id: "cachedView",
			preprocessors: mPreprocessors,
			cache: mCacheSettings
		});
	}

	function destroy(oView) {
		return XMLView.prototype.destroy.bind(oView);
	}

	// skip tests for unsupported browsers
	if (Cache._isSupportedEnvironment()) {
		Cache.reset().then(function() {

			var sLocation = window.location.host + window.location.pathname,
				sBuildTimeStamp = "12345"

			sinon.stub(sap.ui, "getVersionInfo").returns(Promise.resolve({
				libraries: [{
					buildTimestamp: "12345"
				}]
			}));

			function getKeyParts(aKeys, sManifest) {
				var sLanguageTag = sap.ui.getCore().getConfiguration().getLanguageTag(),
					sHashCode = jQuery.sap.hashCode(sManifest || "");
				return "_" + sLanguageTag + "_" + sBuildTimeStamp + "_" + aKeys.join("_") + "(" + sHashCode + ")";
			}

			QUnit.module("Cache API", {
				beforeEach: function() {
					this.oSpy = sinon.spy(Cache, "set");
				},
				afterEach: function() {
					this.oSpy.restore();
					Cache.reset();
				}
			});

			QUnit.test("simple cache key", function(assert) {
				var oSpy = this.oSpy, sKey = "key";
				assert.expect(1);
				return viewFactory({
					keys: [sKey]
				}).loaded().then(function(oView) {
					sinon.assert.calledWith(oSpy, sLocation + "_cachedView" + getKeyParts([sKey]));
					oView.destroy();
				});
			});

			QUnit.test("cache keys array", function(assert) {
				var oSpy = this.oSpy, sKey1 = "key1", sKey2 = "key2";
				assert.expect(1);
				return viewFactory({
					keys: [sKey1, Promise.resolve(sKey2)]
				}).loaded().then(function(oView) {
					sinon.assert.calledWith(oSpy, sLocation + "_cachedView" + getKeyParts([sKey1, sKey2]));
					oView.destroy();
				});
			});

			QUnit.test("no cache key - sync part", function(assert) {
				var error = new Error("No cache keys provided. At least one is required.");
				assert.expect(2);
				assert.throws(viewFactory.bind(null, "foo"), error, "invalid cache config");
				assert.throws(viewFactory.bind(null, {keys: []}), error, "empty array");
			});

			QUnit.test("no cache key - async part", function(assert) {
				var error = new Error("Provided cache keys may not be empty or undefined."),
					oSpy = this.oSpy,
					oLogSpy = sinon.spy(jQuery.sap.log, "debug");

				assert.expect(3);
				return viewFactory({keys: [Promise.resolve()]}).loaded().then(function(oView) {
					sinon.assert.calledWith(oLogSpy, error.message, "XMLViewCacheError", "sap.ui.core.mvc.XMLView");
					sinon.assert.calledWith(oLogSpy, "Processing the View without caching.", "sap.ui.core.mvc.XMLView");
					sinon.assert.notCalled(oSpy);
					oView.destroy();
				});
			});

			QUnit.test("cache key error", function(assert) {
				var error = new Error("Some Error"),
					oView = viewFactory({keys: [Promise.reject(error)]});

				assert.expect(1);
				return oView.loaded().catch(function(_error) {
					assert.equal(_error, error, "Loaded Promise should reject with the thrown error.");
					oView.destroy();
				});
			});

			QUnit.test("cache additional data", function(assert) {
				function _viewFactory() {
					return viewFactory({
						keys: ["key"],
						additionalData: aAdditionalData
					}, {
						xml: [{
							preprocessor: function(xml, oViewInfo, mSettings) {
								mSettings.additionalData.push("bar");
								return xml;
							},
							additionalData: aAdditionalData
						}]
					}).loaded();
				}
				var oSpy = this.oSpy, aAdditionalData = ["foo"];

				assert.expect(2);
				return _viewFactory().then(function(oView) {
					// check preprocessor side effect
					assert.deepEqual(oSpy.args[0][1].additionalData, ["foo", "bar"]);
					oView.destroy();
					// reset original data
					aAdditionalData = ["foo"];
				}).then(_viewFactory).then(function(oView) {
					// check replacement from cache
					assert.deepEqual(aAdditionalData, ["foo", "bar"]);
					oView.destroy();
				});
			});

			QUnit.test("generic key parts", function(assert) {
				var oSpy = this.oSpy;
				var sKey = sLocation + "_cachedView" + getKeyParts(["key"]);
				assert.expect(1);
				return viewFactory({
					keys: ["key"]
				}).loaded().then(function(oView) {
					sinon.assert.calledWith(oSpy, sKey);
					oView.destroy();
				});
			});

			QUnit.test("Component integration", function(assert) {
				var oViewPromise, sKey = "key", oSpy = this.oSpy;
				function createView() {
					oViewPromise = viewFactory({
						keys: [sKey]
					});
					return oViewPromise;
				}
				new Component("comp").runAsOwner(createView.bind(this));
				return oViewPromise.loaded().then(function(oView) {
					var oComp = Component.getOwnerComponentFor(oView);
					assert.ok(oComp, "owner component is set");
					// add the components manifest stringified
					var sManifest = JSON.stringify(oComp.getManifest());
					sinon.assert.calledWith(oSpy, "sap.ui.core.Component_cachedView" + getKeyParts([sKey], sManifest));
					oView.destroy();
				});
			});

			QUnit.test("Preprocessor integration", function(assert) {
				var sKey = "key",
					oSpy = this.oSpy,
					oViewInfo = {
						name: "testdata.mvc.cache",
						componentId: undefined,
						id: "cachedView",
						caller: "Element sap.ui.core.mvc.XMLView#cachedView (testdata.mvc.cache)",
						sync: false
					};
				assert.expect(4);
				assert.ok(TestPreprocessor);
				// inject the preprocessor, ugly, but has to be done to place the spy
				View._mPreprocessors["XML"] = View._mPreprocessors["XML"] || {};
				View._mPreprocessors["XML"]["xml"] = View._mPreprocessors["XML"]["xml"] || [];
				View._mPreprocessors["XML"]["xml"].push({preprocessor: TestPreprocessor, _settings: {assert: jQuery.noop}});
				var oGetCacheKeySpy = sinon.spy(TestPreprocessor, "getCacheKey");
				return viewFactory({keys: [sKey]}).loaded().then(function(oView) {
					sinon.assert.calledOnce(oGetCacheKeySpy);
					sinon.assert.calledWith(oGetCacheKeySpy, oViewInfo);
					// "foo" is the part coming from TestPreprocessor.js
					sinon.assert.calledWith(oSpy, sLocation + "_cachedView" + getKeyParts(["foo", sKey]));
					oSpy.restore();
					oView.destroy();
					// remove the preprocessor
					View._mPreprocessors["XML"]["xml"].splice(1,1);
				});
			});

			QUnit.module("Cache integration", {
				beforeEach: function() {
					this.oSpy = sinon.spy(jQuery.sap, "loadResource");
				},
				afterEach: function() {
					this.oSpy.restore();
				}
			});

			QUnit.test("write to cache", function(assert) {
				var that = this, sKey = "key";
				assert.expect(4);
				return Cache.get(sLocation + "_cachedView" + getKeyParts([sKey])).then(function(oCachedResource) {
					assert.ok(!oCachedResource, "cache empty");
					return viewFactory({
						keys: [sKey]
					}).loaded().then(function(oView) {
						assert.ok(that.oSpy.calledWith("testdata/mvc/cache.view.xml"), "load resource called");
						assert.ok(oView.byId("Button2"), "controls created");
						return Cache.get(sLocation + "_cachedView" + getKeyParts([sKey])).then(function(oCachedResource) {
							assert.ok(oCachedResource, "cache filled");
						}).then(destroy(oView));
					});
				});
			});

			QUnit.test("read from cache", function(assert) {
				var that = this, sKey = "key";
				assert.expect(2);
				return viewFactory({
					keys: [sKey]
				}).loaded().then(function(oView) {
					oView.destroy();
					that.oSpy.reset();
				}).then(function() {
					return viewFactory({
						keys: [sKey]
					}).loaded().then(function(oView) {
						assert.ok(!that.oSpy.calledWith("testdata/mvc/cache.view.xml"), "load resource not called");
						assert.ok(oView.byId("Button2"), "controls created");
						oView.destroy();
					});
				});
			});

		});

	} else {

		QUnit.module("Cache integration - unsupported browser");

		QUnit.test("should not break", function(assert) {
			var that = this, sKey = "key";
			assert.expect(2);
			return viewFactory({
				keys: [sKey]
			}).loaded().then(function(oView1) {
				assert.ok(oView1.byId("Button2"), "controls created");
				oView1.destroy();
				return viewFactory({
					keys: [sKey]
				}).loaded().then(function(oView2) {
					assert.ok(oView2.byId("Button2"), "controls created");
					oView2.destroy();
				});
			});
		});

		QUnit.test("should not call the cache", function(assert) {
			var sKey = "key",
				oGetSpy = sinon.spy(Cache, "get"),
				oSetSpy = sinon.spy(Cache, "set");
			assert.expect(2);
			return viewFactory({
				keys: [sKey]
			}).loaded().then(function(oView1) {
				sinon.assert.notCalled(oGetSpy);
				sinon.assert.notCalled(oSetSpy);
				oGetSpy.restore();
				oSetSpy.restore();
			});
		});

	}
});
