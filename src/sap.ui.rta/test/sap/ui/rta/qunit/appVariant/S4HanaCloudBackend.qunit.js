/* global QUnit  */
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/rta/appVariant/S4HanaCloudBackend",
	"sap/ui/thirdparty/sinon"
], function(
	S4HanaCloudBackend,
	sinon) {

	// Initialize
	"use strict";
	var sandbox = sinon.sandbox.create();
	QUnit.start();

	// Test
	QUnit.module( "Given the S4HanaCloudBackend class", {

		afterEach : function(assert) {
			sandbox.restore();
		}

	}, function() {

		QUnit.test("When instantiated,", function(assert) {

			var oS4HanaCloudBackend = new S4HanaCloudBackend( );
			assert.ok( oS4HanaCloudBackend, 'the constructor call is fine' );

		});

		QUnit.test("When a notification is requested, that the FLP customizing is ready for an IAM app which does not exist,", function(assert) {

			var done = assert.async();
			var oS4HanaCloudBackend = new S4HanaCloudBackend();

			function isReady( sIamAppId ) {
				assert.fail("then it is an error if FLP customizing is detected");
				done();
			}

			// Perform a check each 100 msec, no more than 3 checksaps
			oS4HanaCloudBackend.notifyFlpCustomizingIsReady( 'INVALID_IAM_ID', isReady, 100, 3 ).catch(
				function() {
					assert.ok( true,
						"then a failure is reported if there's no connection to an S4HANA service /sap/opu/odata/sap/APS_IAM_APP_SRV"
					);
					done();
				}
			);

		});

		QUnit.test("When stubing checkFlpCustomizingIsReady(\"VALID_IAM_ID\") to return true immediately,", function(assert) {

			var done = assert.async();
			var oS4HanaCloudBackend = new S4HanaCloudBackend();

			// Stubbing checkFlpCustomizingIsReady
			var checkFlpCustomizingIsReadyStub = sinon.stub( oS4HanaCloudBackend, "checkFlpCustomizingIsReady" );
			checkFlpCustomizingIsReadyStub.withArgs('VALID_IAM_ID').returns( Promise.resolve( true ) );

			function isReady( sIamAppId ) {
				assert.equal(sIamAppId, "VALID_IAM_ID", "then notifyFlpCustomizingIsReady calls isReady( \"VALID_IAM_ID\" )");
				done();
			}

			// Perform a check each 100 msec, no more than 3 checks
			oS4HanaCloudBackend.notifyFlpCustomizingIsReady( "VALID_IAM_ID", isReady, 100, 3 ).catch(
				function() {
					assert.ok( false, "Error: An unexpected exception occured" );
					done();
				}
			);

		});


		QUnit.test("When stubing checkFlpCustomizingIsReady(\"VALID_IAM_ID\") to return true in the third call,", function(assert) {

			var done = assert.async();
			var oS4HanaCloudBackend = new S4HanaCloudBackend();

			// Stubbing checkFlpCustomizingIsReady
			var checkFlpCustomizingIsReadyStub = sinon.stub( oS4HanaCloudBackend, "checkFlpCustomizingIsReady" );
			checkFlpCustomizingIsReadyStub.withArgs('VALID_IAM_ID').onFirstCall().returns( Promise.resolve( false ) );
			checkFlpCustomizingIsReadyStub.onSecondCall().returns( Promise.resolve( false ) );
			checkFlpCustomizingIsReadyStub.onThirdCall().returns( Promise.resolve( true ) );

			function isReady( sIamAppId ) {
				assert.equal(sIamAppId, "VALID_IAM_ID", "then finally notifyFlpCustomizingIsReady calls isReady( \"VALID_IAM_ID\" )");
			}

			// Perform a check each 100 msec, no more than 3 checks
			oS4HanaCloudBackend.notifyFlpCustomizingIsReady( "VALID_IAM_ID", isReady, 100, 3 ).then(
				function( status ) {
					assert.deepEqual( status, { iamAppId : "VALID_IAM_ID", flpCustomizingIsReady : true }, "and the final status is as expected");
					done();
				}
			).catch(
				function() {
					assert.ok( false, "Error: An unexpected exception occured" );
					done();
				}
			);

		});

		QUnit.test("When stubing checkFlpCustomizingIsReady(\"VALID_IAM_ID\") to return false in the last call,", function(assert) {

			var done = assert.async();
			var oS4HanaCloudBackend = new S4HanaCloudBackend();

			// Stubbing checkFlpCustomizingIsReady
			var checkFlpCustomizingIsReadyStub = sinon.stub( oS4HanaCloudBackend, "checkFlpCustomizingIsReady" );
			checkFlpCustomizingIsReadyStub.withArgs('VALID_IAM_ID').onFirstCall().returns( Promise.resolve( false ) );
			checkFlpCustomizingIsReadyStub.onSecondCall().returns( Promise.resolve( false ) );
			checkFlpCustomizingIsReadyStub.onThirdCall().returns( Promise.resolve( false ) );

			function isReady( sIamAppId ) {
				throw "isReady must not be called";
			}

			// Perform a check each 100 msec, no more than 3 checks
			oS4HanaCloudBackend.notifyFlpCustomizingIsReady( "VALID_IAM_ID", isReady, 100, 3 ).then(
				function( status ) {
					assert.deepEqual( status, { iamAppId : "VALID_IAM_ID", flpCustomizingIsReady : false }, "then the final status is as expected");
					done();
				}
			).catch(
				function() {
					assert.ok( false, "Error: An unexpected exception occured" );
				}
			);

		});

		QUnit.test("When checking a backend response for an existing IAM app with valid FLP custmizing,", function(assert) {

			// Response of ODATA service
			var responseFlpCustomizingIsThere =
			{
			  "__metadata": {
			    "id": "https://ldcietx.mo.sap.corp:44310/sap/opu/odata/sap/APS_IAM_APP_SRV/AppStatusCheckSet('YY1_ABIFNJRSDEPNPIE6IYLRUU7IWQ_FLAV')",
			    "uri": "https://ldcietx.mo.sap.corp:44310/sap/opu/odata/sap/APS_IAM_APP_SRV/AppStatusCheckSet('YY1_ABIFNJRSDEPNPIE6IYLRUU7IWQ_FLAV')",
			    "type": "APS_IAM_APP_SRV.AppStatusCheck"
			  },
			  "AppStatusTable": "{\"ITAB\":[]}",
			  "AppID": "YY1_ABIFNJRSDEPNPIE6IYLRUU7IWQ_FLAV",
			  "AppStatus": ""
			};

			// Check evaluation of ODATA service response
			assert.equal(
				S4HanaCloudBackend._evaluateAppIntegrityEstimation( responseFlpCustomizingIsThere ),
				true,
				"then _evaluateAppIntegratityEstimation(response) returns true"
			);
		});


		QUnit.test("When checking a backend response for an IAM app without valid FLP custmizing,", function(assert) {

			// Response of ODATA service
			var responseFlpCustomizingIsNotThere =
			{
			  "__metadata": {
			    "id": "https://ldcietx.mo.sap.corp:44310/sap/opu/odata/sap/APS_IAM_APP_SRV/AppStatusCheckSet('INVALID_IAM_ID')",
			    "uri": "https://ldcietx.mo.sap.corp:44310/sap/opu/odata/sap/APS_IAM_APP_SRV/AppStatusCheckSet('INVALID_IAM_ID')",
			    "type": "APS_IAM_APP_SRV.AppStatusCheck"
			  },
			  "AppStatusTable": "{\"ITAB\":[{\"TYPE\":\"E\",\"ID\":\"CM_APS_IAM_APP\",\"NUMBER\":\"039\",\"MESSAGE\":\"FATAL ERROR: App not registered\",\"LOG_NO\":\"\",\"LOG_MSG_NO\":\"000000\",\"MESSAGE_V1\":\"\",\"MESSAGE_V2\":\"\",\"MESSAGE_V3\":\"\",\"MESSAGE_V4\":\"\",\"PARAMETER\":\"\",\"ROW\":0,\"FIELD\":\"\",\"SYSTEM\":\"\"},{\"TYPE\":\"E\",\"ID\":\"CM_APS_IAM_APP\",\"NUMBER\":\"040\",\"MESSAGE\":\"App not exist\",\"LOG_NO\":\"\",\"LOG_MSG_NO\":\"000000\",\"MESSAGE_V1\":\"\",\"MESSAGE_V2\":\"\",\"MESSAGE_V3\":\"\",\"MESSAGE_V4\":\"\",\"PARAMETER\":\"\",\"ROW\":0,\"FIELD\":\"\",\"SYSTEM\":\"\"}]}",
			  "AppID": "INVALID_IAM_ID",
			  "AppStatus": "FATAL ERROR: App not registered\\nApp not exist\\n"
			};

			// Check evaluatio of ODATA service response
			assert.equal(
				S4HanaCloudBackend._evaluateAppIntegrityEstimation( responseFlpCustomizingIsNotThere ),
				false,
				"then _evaluateAppIntegratityEstimation(response) returns false"
			);
		});

		QUnit.test("When checking an unexpected backend response format,", function(assert) {

			// Response of ODATA service
			var unexpectedBackendResponse =
			{
			  "__metadata": {
			    "id": "https://ldcietx.mo.sap.corp:44310/sap/opu/odata/sap/APS_IAM_APP_SRV/AppStatusCheckSet('INVALID_IAM_ID')",
			    "uri": "https://ldcietx.mo.sap.corp:44310/sap/opu/odata/sap/APS_IAM_APP_SRV/AppStatusCheckSet('INVALID_IAM_ID')",
			    "type": "APS_IAM_APP_SRV.AppStatusCheck"
			  },
			  "AppID": "INVALID_IAM_ID",
			  "AppStatus": "FATAL ERROR: App not registered\\nApp not exist\\n"
			};

			// Check evaluatio of ODATA service response
			assert.throws(
				function() {
					S4HanaCloudBackend._evaluateAppIntegrityEstimation( unexpectedBackendResponse );
				},
				"then an exception gets raised"
			);
		});
	});

});