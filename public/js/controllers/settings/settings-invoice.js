angular.module('app').controller('settings-invoice', ['server', '$scope', '$rootScope', '$routeParams', '$log',
    function(db, s, r, params, $log) {
        //
        $U.expose('s', s);


        //
        s.item = {
            code: '',
            description: '',
            content: '',
            updatedByHuman: true
        };
        //
        check(); //checks when the wysing lib is ready and init the components.

        s.variables = {
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
            }
            //['PRICE', 'PRICEHT', 'REVENUEHT', 'DIAGREMUNERATIONHT', 'ADDRESS', 'START', 'END'];

        function isNumber(key) {
            return key.toUpperCase().indexOf('PRICE') != -1 || key.toUpperCase().indexOf('HT') != -1;
        }

        Object.keys(s.variables).forEach(function(key) {
            if (isNumber(key)) {
                s.variables[key.toUpperCase().replace('}}', '_FORMAT}}')] = s.variables[key] + "(two decimals, separated with comma)";
                delete s.variables[key];
            }
        });

        s.orderId = '';
        s.fetchOrder = function() {
            var payload = {
                status: 'prepaid',
                __populate: {
                    _client: "email firstName lastName address siret companyName",
                    _diag: "email firstName lastName address siret companyName tva_intra_comm isAutoentrepreneur"
                }
            };
            if (s.orderId) {
                payload._id = s.orderId;
            }
            db.ctrl('Order', 'get', payload).then(res => {
                if (res.ok) {
                    if (!res.result) {
                        $log.warn('Random prepaid order not found.');
                    }
                    $log.debug('random prepaid order is Order #' + res.result.number);
                    s.randomOrder = res.result;
                }
                else {
                    r.warningMessage('Problem fetching random order.');
                }
            });
        }
        s.fetchOrder();

        function getContent() {

            if (s.editor && s.editor.getValue) {
                return s.editor.getValue() || '';
            }

            return tinymce.activeEditor.getContent({
                format: 'raw'
            });
        }

        function setContent(html) {

            if (s.editor && s.editor.getValue) {
                return s.editor.setValue(html || '');
            }

            tinymce.activeEditor.setContent(html, {
                format: 'raw'
            });
        }

        s.beautify = function() {
            var beautify = ace.require("ace/ext/beautify"); // get reference to extension
            var editor = ace.edit("editor"); // get reference to editor
            beautify.beautify(s.editor.session);
        }

        var _is_preview_pdf = false,
            _is_preview_html = false;
        s.isPreviewPDF = () => _is_preview_pdf;
        s.isPreviewHTML = () => _is_preview_html;
        s.closePreviewHTML = () => {
            _is_preview_html = false;
            r.dom(function() {
                $('#previewHTML').empty();
            });
        };
        s.closePreviewPDF = () => {
            _is_preview_pdf = false;
            r.dom(function() {
                $('#previewPDF').empty();
            });
        };


        //
        s.previewPDF = () => {
            _is_preview_pdf = true;

            if (!s.randomOrder) {
                return r.warningMessage('At least one Order saved in DB is required.');
            }

            s.item.content = window.encodeURIComponent(getContent());
            var html = $D.OrderReplaceHTML(window.decodeURIComponent(s.item.content), s.randomOrder, r);

            //return $log.debug(html);

            s.previewHTML(html);

            html = window.encodeURIComponent(html);



            r.ws.ctrl("Pdf", "view", {
                html: html
            }).then(res => {
                if (res.ok) {
                    s.save();

                    if (PDFObject) {

                        //if client is https and url is http, convert url to https
                        if (window.location.origin.indexOf('https') !== -1) {
                            var hasHttp = !(res.result.indexOf('https') !== -1) && (window.location.origin.indexOf('http'));
                            res.result = res.result.replace('http', 'https');
                        }

                        PDFObject.embed(res.result, "#previewPDF");
                    }
                    else {
                        var win = window.open(res.result, '_blank');
                        win.focus();
                    }


                }
                else {
                    r.warningMessage('Server Issue, try later.');
                }
            });
        };
        //
        s.read = function() {

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
                                s.item = res.result;

                                var decodedHtml = window.decodeURIComponent(s.item.content);

                                setContent(decodedHtml)
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
                                        s.item = res.result;
                                        var decodedHtml = window.decodeURIComponent(s.item.content);
                                        setContent(decodedHtml)
                                    }
                                });
                            }
                        }
                        else {
                            r.warningMessage('Server issue while reading item. Try later.');
                        }
                    });
                    //
                }
            });


        };
        //
        s.save = function() {
            if (!s.item.code) return r.warningMessage('Code required');
            if (!s.item.description) return r.warningMessage('Description required');
            if (!s.item._category) return r.warningMessage('Page Section required');
            //
            s.item.updatedByHuman = true;
            s.item.content = window.encodeURIComponent(getContent());
            db.ctrl('Text', 'save', s.item).then(function() {
                //r.route('texts');
                r.infoMessage("Changes saved", 5000);
            });
        };

        function check() {
            if (typeof window.ace !== 'undefined') {
                r.dom(init);
            }
            else setTimeout(check, 100);
        }


        s.toggleFullscreen = function() {
            s.editor.container.webkitRequestFullscreen();
        };
        s.formatCode = function() {
            s.editor.session.setValue(html_beautify(s.editor.session.getValue()));
        };
        s.previewHTML = function(html) {
            _is_preview_html = true;

            if (!html && !s.randomOrder) {
                return r.warningMessage('At least one Order saved in DB is required.');
            }

            r.dom(function() {
                if (!html) {
                    html = '';
                    try {
                        html = window.decodeURIComponent(getContent())
                    }
                    catch (err) {
                        html = getContent();
                    }
                    html = $D.OrderReplaceHTML(html, s.randomOrder, r);
                }
                $('#previewHTML').empty().append($.parseHTML(html));
            });
        }


        function initAce() {
            s.editor = ace.edit("editor");
            //-s.editor.setTheme("ace/theme/monokai");
            s.editor.getSession().setMode("ace/mode/html");

            s.editor.setTheme("ace/theme/merbivore");
            s.editor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true
            });

            s.editor.getSession().setUseWrapMode(true)
            s.editor.commands.addCommand({
                name: "fullscreen",
                bindKey: "ctrl-shift-f",
                exec: function(env, args, request) {
                    s.toggleFullscreen();
                }
            });
            s.editor.commands.addCommand({
                name: "showKeyboardShortcuts",
                bindKey: {
                    win: "Ctrl-Alt-h",
                    mac: "Command-Alt-h"
                },
                exec: function(editor) {
                    ace.config.loadModule("ace/ext/keybinding_menu", function(module) {
                        module.init(editor);
                        editor.showKeyboardShortcuts()
                    })
                }
            })
            waitBeautify(function() {
                s.editor.commands.addCommand({
                    name: "beautify",
                    bindKey: "ctrl-alt-f",
                    exec: function(env, args, request) {
                        s.formatCode();
                    }
                });
                $log.debug('Beautify added (CTRL + K)');
            });



        };


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
            r.dom(s.read, 0);
        }
    }
]);
