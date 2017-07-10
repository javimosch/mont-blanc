(function() {
    /*global angular, $U, $D, PDFObject,ace, html_beautify, tinymce, $*/
    angular.module('settings-feature-module').controller('settings-invoice', ['server', '$scope', '$rootScope', '$routeParams', '$log',
        function(db, $scope, $rootScope, params, $log) {
            //
            $U.exposeGlobal('s', $scope);


            //
            $scope.item = {
                code: '',
                description: '',
                content: '',
                updatedByHuman: true
            };
            //
            check(); //checks when the wysing lib is ready and init the components.

            $scope.variables = {
                "{{LOGO}}": "Diagnostical Logo",
                "{{ORDER_DESCRIPTION}}": "Ex: Pack Vent: ...",
                "{{ADDRESS}}": "Diag Address",
                "{{CLIENT_FULLNAME}}": "Client first & last name",
                "{{CLIENT_FIRSTNAME}}": "Client first name",
                "{{CLIENT_LASTNAME}}": "Client last name",
                "{{CLIENT_EMAIL}}": "Client email",
                "{{CLIENT_ADDRESS}}": "Client address",
                "{{CLIENT_SIRET}}": "Client siret",
                "{{CLIENT_COMPANY_NAME}}": "Client company name",
                "{{DIAG_FULLNAME}}": "Diag full name (first name + last name)",
                "{{DIAG_FIRSTNAME}}": "Diag first name",
                "{{DIAG_LASTNAME}}": "Diag last name",
                "{{DIAG_EMAIL}}": "Diag email",
                "{{DIAG_ADDRESS}}": "Diag address",
                "{{DIAG_SIRET}}": "Diag siret",
                "{{DIAG_TVA_INTRA_COMM}}": "Diag TVA Intra Comm", //tva_intra_comm
                "{{DIAG_COMPANY_NAME}}": "Diag company name",
                '{{LANDLORDFULLNAME}}': "Landlord Fullname (For Agency / Other only)",
                '{{LANDLORDEMAIL}}': "Associated Landlord Email (For Agency / Other only)",
                '{{LANDLORDPHONE}}': "Associated Landlord Phone (For Agency / Other only)",
                '{{LANDLORDADDRESS}}': "Associated Landlord Address (For Agency / Other only)",
                '{{CREATEDAT_FORMAT}}': "Order creation date Ex: 16/06/2016 10h29",
                '{{PAIDAT_FORMAT}}': "Order paid date Ex: 16/06/2016 10h29",
                '{{START_FORMAT}}': "Order diag start date Ex: 16/06/2016 10h29",
                '{{END_FORMAT}}': "Order diag start date Ex: 16/06/2016 10h29",
                "{{PRICE}}": "Order TTC Price",
                "{{PRICEHT}}": "Order HT Price",
                "{{VATRATE}}": "Order VAT Rate Applied",
                "{{VATPRICE}}": "Order VAT Price Applied",
                "{{REVENUEHT}}": "Diagnostical Revenue HT Price",
                "{{DIAGREMUNERATIONHT}}": "Diag Remuneration HT",
                "{{NUMBER}}": "Order invoice number."
            };
            //['PRICE', 'PRICEHT', 'REVENUEHT', 'DIAGREMUNERATIONHT', 'ADDRESS', 'START', 'END'];

            function isNumber(key) {
                return key.toUpperCase().indexOf('PRICE') != -1 || key.toUpperCase().indexOf('HT') != -1;
            }

            Object.keys($scope.variables).forEach(function(key) {
                if (isNumber(key)) {
                    $scope.variables[key.toUpperCase().replace('}}', '_FORMAT}}')] = $scope.variables[key] + "(two decimals, separated with comma)";
                    delete $scope.variables[key];
                }
            });

            $scope.orderId = '';
            $scope.fetchOrder = function() {
                var payload = {
                    //status: 'prepaid',
                    __rules: {
                        status: {
                            $in: ['prepaid', 'completed']
                        }
                    },
                    __populate: {
                        _client: "email firstName lastName address siret companyName",
                        _diag: "email firstName lastName address siret companyName tva_intra_comm isAutoentrepreneur"
                    }
                };
                if ($scope.orderId) {
                    payload._id = $scope.orderId;
                }
                db.ctrl('Order', 'get', payload).then(res => {
                    if (res.ok) {
                        if (!res.result) {
                            $log.warn('Random prepaid order not found.');
                        }
                        $log.debug('random prepaid order is Order #' + res.result.number);
                        $scope.randomOrder = res.result;
                    }
                    else {
                        $rootScope.warningMessage('Problem fetching random order.');
                    }
                });
            };
            $scope.fetchOrder();

            function getContent() {

                if ($scope.editor && $scope.editor.getValue) {
                    return $scope.editor.getValue() || '';
                }

                return tinymce.activeEditor.getContent({
                    format: 'raw'
                });
            }

            function setContent(html) {

                if ($scope.editor && $scope.editor.getValue) {
                    return $scope.editor.setValue(html || '');
                }

                tinymce.activeEditor.setContent(html, {
                    format: 'raw'
                });
            }

            $scope.beautify = function() {
                var beautify = ace.require("ace/ext/beautify"); // get reference to extension
                beautify.beautify($scope.editor.session);
            };

            var _is_preview_pdf = false,
                _is_preview_html = false;
            $scope.isPreviewPDF = () => _is_preview_pdf;
            $scope.isPreviewHTML = () => _is_preview_html;
            $scope.closePreviewHTML = () => {
                _is_preview_html = false;
                $rootScope.dom(function() {
                    $('#previewHTML').empty();
                });
            };
            $scope.closePreviewPDF = () => {
                _is_preview_pdf = false;
                $rootScope.dom(function() {
                    $('#previewPDF').empty();
                });
            };


            //
            $scope.previewPDF = () => {
                _is_preview_pdf = true;

                if (!$scope.randomOrder) {
                    return $rootScope.warningMessage('At least one Order saved in DB is required.');
                }

                $scope.item.content = window.encodeURIComponent(getContent());
                var html = $D.OrderReplaceHTML(window.decodeURIComponent($scope.item.content), $scope.randomOrder, $rootScope);

                //return $log.debug(html);

                $scope.previewHTML(html);

                html = window.encodeURIComponent(html);



                $rootScope.ws.ctrl("Pdf", "view", {
                    html: html
                }).then(res => {
                    if (res.ok) {
                        $scope.save();

                        if (PDFObject) {

                            //if client is https and url is http, convert url to https
                            if (window.location.origin.indexOf('https') !== -1) {
                                if (res.result.indexOf('https') == -1) {
                                    res.result = res.result.replace('http', 'https');
                                }
                            }

                            PDFObject.embed(res.result, "#previewPDF");
                        }
                        else {
                            var win = window.open(res.result, '_blank');
                            win.focus();
                        }


                    }
                    else {
                        $rootScope.warningMessage('Server Issue, try later.');
                    }
                });
            };
            //
            $scope.read = function() {

                db.ctrl('Category', "createUpdate", {
                    code: "DIAGS_SETTINGS",
                    __match: ['code']
                }).then(function(_res) {
                    if (_res && _res.ok && _res.result) {
                        //
                        var _category = _res.result._id;

                        db.ctrl('Text', 'get', {
                            _category: _category,
                            code: 'INVOICE',
                        }).then(function(res) {
                            if (res.ok) {
                                if (res.result) {
                                    $scope.item = res.result;

                                    var decodedHtml = window.decodeURIComponent($scope.item.content);

                                    setContent(decodedHtml);
                                }
                                else {
                                    db.ctrl('Text', 'createUpdate', {
                                        _category: _category,
                                        code: 'INVOICE',
                                        description: 'diags-invoice-template',
                                        content: window.encodeURIComponent("&nbsp;"),
                                        __match: ['code']
                                    }).then(function(res) {
                                        if (res.ok && res.result) {
                                            $scope.item = res.result;
                                            var decodedHtml = window.decodeURIComponent($scope.item.content);
                                            setContent(decodedHtml);
                                        }
                                    });
                                }
                            }
                            else {
                                $rootScope.warningMessage('Server issue while reading item. Try later.');
                            }
                        });
                        //
                    }
                });


            };
            //
            $scope.save = function() {
                if (!$scope.item.code) return $rootScope.warningMessage('Code required');
                if (!$scope.item.description) return $rootScope.warningMessage('Description required');
                if (!$scope.item._category) return $rootScope.warningMessage('Page Section required');
                //
                $scope.item.updatedByHuman = true;
                $scope.item.content = window.encodeURIComponent(getContent());
                db.ctrl('Text', 'save', $scope.item).then(function() {
                    //r.route('texts');
                    $rootScope.infoMessage("Changes saved", 5000);
                });
            };

            function check() {
                if (typeof window.ace !== 'undefined') {
                    $rootScope.dom(init);
                }
                else {
                    setTimeout(check, 500);
                }
            }


            $scope.toggleFullscreen = function() {
                $scope.editor.container.webkitRequestFullscreen();
            };
            $scope.formatCode = function() {
                $scope.editor.session.setValue(html_beautify($scope.editor.session.getValue()));
            };
            $scope.previewHTML = function(html) {
                _is_preview_html = true;

                if (!html && !$scope.randomOrder) {
                    return $rootScope.warningMessage('At least one Order saved in DB is required.');
                }

                $rootScope.dom(function() {
                    if (!html) {
                        html = '';
                        try {
                            html = window.decodeURIComponent(getContent());
                        }
                        catch (err) {
                            html = getContent();
                        }
                        html = $D.OrderReplaceHTML(html, $scope.randomOrder, $rootScope);
                    }
                    $('#previewHTML').empty().append($.parseHTML(html));
                });
            };


            $scope.initAce = initAce();

            function initAce() {

                //if (typeof window.ace == 'undefined') return setTimeout(initAce, 500);
                //if(!window.aceOK) return setTimeout(initAce, 500);

                if ($scope.aceInitialized) return;
                $scope.aceInitialized = true;

                console.log('Initializing ace');

                var ace = window.ace;

                $rootScope.dom(function() {

                    $scope.editor = ace.edit("diagnostical-invoice-editor");
                    var editor = $scope.editor;
                    var CodeMode = ace.require("ace/mode/html").Mode;
                    editor.session.setMode(new CodeMode());
                    editor.setTheme("ace/theme/twilight");

                    //-s.editor.setTheme("ace/theme/monokai");
                    //$scope.editor.getSession().setMode("ace/mode/html");

                    //$scope.editor.setTheme("ace/theme/monokai");

                    /*

                                        $scope.editor.setOptions({
                                            //enableBasicAutocompletion: true,
                                            //enableSnippets: true
                                        });


                                        $scope.editor.getSession().setUseWrapMode(true);
                                        $scope.editor.commands.addCommand({
                                            name: "fullscreen",
                                            bindKey: "ctrl-shift-f",
                                            exec: function(env, args, request) {
                                                $scope.toggleFullscreen();
                                            }
                                        });
                                        $scope.editor.commands.addCommand({
                                            name: "showKeyboardShortcuts",
                                            bindKey: {
                                                win: "Ctrl-Alt-h",
                                                mac: "Command-Alt-h"
                                            },
                                            exec: function(editor) {
                                                ace.config.loadModule("ace/ext/keybinding_menu", function(module) {
                                                    module.init(editor);
                                                    editor.showKeyboardShortcuts();
                                                });
                                            }
                                        });
                                        waitBeautify(function() {
                                            $scope.editor.commands.addCommand({
                                                name: "beautify",
                                                bindKey: "ctrl-alt-f",
                                                exec: function(env, args, request) {
                                                    $scope.formatCode();
                                                }
                                            });
                                            $log.debug('Beautify added (CTRL + K)');
                                        });*/


                    $rootScope.dom($scope.read, 0);

                });


            }


            function waitBeautify(cb) {
                if (!ace) return setTimeout(() => waitBeautify(cb), 500);
                if (window.html_beautify) {
                    cb && cb();
                }
                else {
                    return setTimeout(() => waitBeautify(cb), 500);
                }
            }

            function init() {
                initAce();

            }
        }
    ]);

})();
