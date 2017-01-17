angular.module('app').controller('settings-invoice', ['server', '$scope', '$rootScope', '$routeParams', 'focus', '$log',
    function(db, s, r, params, focus, $log) {
        //
        $U.expose('s', s);

        const EDITOR_NAME = 'ace';
        const EDITOR_INIT_FN = {
            ace: 'initAce',
            tinymce: 'initTinyMCE'
        }

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
                "{{CLIENT_FULLNAME}}": "Particular Client / Agency / Other first & last name",
                "{{CLIENT_FIRSTNAME}}": "Particular Client / Agency / Other first name",
                "{{CLIENT_LASTNAME}}": "Particular Client / Agency / Other last name",
                "{{CLIENT_EMAIL}}": "Particular Client / Agency / Other email",
                "{{CLIENT_ADDRESS}}": "Particular Client / Agency / Other address",
                "{{DIAG_FULLNAME}}": "Diag full name (first name + last name)",
                "{{DIAG_FIRSTNAME}}": "Diag first name",
                "{{DIAG_LASTNAME}}": "Diag last name",
                "{{DIAG_EMAIL}}": "Diag email",
                "{{DIAG_ADDRESS}}": "Diag address",
                "{{DIAG_SIRET}}": "Diag siret",
                "{{DIAG_COMPANY_NAME}}": "Diag company name",
                '{{LANDLORDFULLNAME}}': "Landlord Fullname (Agency / Other only)",
                '{{LANDLORDEMAIL}}': "Landlord Email (Agency / Other only)",
                '{{LANDLORDPHONE}}': "Landlord Phone (Agency / Other only)",
                '{{LANDLORDADDRESS}}': "Landlord Address (Agency / Other only)",
                '{{CREATEDAT}}': "Order creation date Ex: 16/06/2016 10h29",
                '{{START}}': "Order diag start date Ex: 16/06/2016 10h29",
                '{{END}}': "Order diag start date Ex: 16/06/2016 10h29",
                "{{PRICE}}": "Order TTC Price",
                "{{PRICEHT}}": "Order HT Price",
                "{{VATRATE}}": "Order VAT Rate Applied",
                "{{VATPRICE}}": "Order VAT Price Applied",
                "{{REVENUEHT}}": "Diagnostical Revenue HT Price",
                "{{DIAGREMUNERATIONHT}}": "Diag Remuneration HT",
            }
            //['PRICE', 'PRICEHT', 'REVENUEHT', 'DIAGREMUNERATIONHT', 'ADDRESS', 'START', 'END'];


        db.ctrl('Order', 'get', {
            __populate: {
                _client: "email firstName lastName address",
                _diag: "email firstName lastName address siret companyName"
            }
        }).then(res => {
            if (res.ok) {
                s.randomOrder = res.result;

            }
        });

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

        //
        s.preview = () => {

            if (!s.randomOrder) {
                return r.warningMessage('At least one Order saved in DB is required.');
            }

            s.item.content = window.encodeURIComponent(getContent());
            var html = $D.OrderReplaceHTML(window.decodeURIComponent(s.item.content), s.randomOrder, r);

            //return $log.debug(html);

            html = window.encodeURIComponent(html);



            r.ws.ctrl("Pdf", "view", {
                html: html
            }).then(res => {
                if (res.ok) {
                    s.save();

                    if (PDFObject) {
                        PDFObject.embed(res.result, "#preview");
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
            if (typeof window[EDITOR_NAME] !== 'undefined') {
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
        s.previewHTML = function() {
            r.dom(function() {
                var html = $D.OrderReplaceHTML(window.decodeURIComponent(getContent()), s.randomOrder, r);
                $('#previewHTML').append($.parseHTML(html));
            });
        }


        s.initAce = function() {
            s.editor = ace.edit("editor");
            s.editor.setTheme("ace/theme/monokai");
            s.editor.getSession().setMode("ace/mode/html");
            s.editor.getSession().setUseWrapMode(true)
            s.editor.setOption("enableEmmet", true);
            waitBeautify(function() {
                s.editor.commands.addCommand({
                    name: "beautify",
                    bindKey: "ctrl-alt-f",
                    exec: function(env, args, request) {
                        s.formatCode();
                    }
                });
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


                $log.debug('Beautify added (CTRL + K)');
            });



        };


        function waitBeautify(cb) {
            if (!ace) return setTimeout(() => waitBeautify(cb), 500);
            try {
                if (window.html_beautify) {
                    cb && cb();
                }
                else {
                    return setTimeout(() => waitBeautify(cb), 500);
                }
            }
            catch (err) {
                return setTimeout(() => waitBeautify(cb), 500);
            }
        }

        s.initTinyMCE = function() {

            if (typeof(window.tinyMCE) !== 'undefined') {
                var length = window.tinyMCE.editors.length;
                for (var i = length; i > 0; i--) {
                    window.tinyMCE.editors[i - 1].remove();
                };
            }

            tinymce.init({
                selector: '#editor',
                theme: 'modern',
                //width: 600,
                height: 300,
                plugins: [
                    //'autoresize',
                    'advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker',
                    'searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking',
                    'save table contextmenu directionality emoticons template paste textcolor'
                ],
                content_css: 'css/diags.design.css',
                toolbar: 'insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | print preview media fullpage | forecolor backcolor emoticons'
            });

        };

        function init() {
            s[EDITOR_INIT_FN[EDITOR_NAME]]();
            r.dom(s.read, 0);
        }
    }
]);
