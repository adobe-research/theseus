/*
 * Copyright (c) 2012 Massachusetts Institute of Technology, Adobe Systems
 * Incorporated, and other contributors. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define */

define({
    "PRODUCT_NAME"                       : "Theseus",

    //Invitation
    "INVITATION_HEADER"                  : "Obrigado por instalar o Theseus!",
    "INVITATION_TEXT_1"                  : "O Theseus é um projecto de investigação do doutorando do MIT Tom Lieber (na foto à direita) e ele gostaria de saber como o utiliza!",
    "INVITATION_USAGE"                   : "Permito a recolha de informação anónima de como utilizo o Theseus.",
    "INVITATION_USAGE_DETAIL"            : "Ver exactamente o que irá ser relatado e o porquê.",
    "INVITATION_USAGE_DETAIL_URL"        : "https://github.com/adobe-research/theseus/wiki/Anonymous-Usage-Reporting",
    "INVITATION_CONTACT"                 : "Posso estar disponível para falar sobre como utilizo o Theseus.",
    "INVITATION_EMAIL_ADRESS"            : "O meu endereço de email:",
    "INVITATION_CONFIRM"                 : "Confirmar",
    "INVITATION_CANCEL"                  : "Cancelar",

    //UI
    "UI_NO_CALLS"                        : "0 chamadas",
    "UI_SINGLE_CALL"                     : "1 chamada",
    "UI_MULTIPLE_CALLS"                  : "{0} chamadas",
    "UI_BACKTRACE"                       : "Rastrear",
    "UI_BACKTRACE_LOADING"               : "A carregar rastreamento...",
    "UI_BACKTRACE_BACK"                  : "Voltar atrás",
    "UI_DETAILS_RETURN_VALUE"            : "valor devolvido",
    "UI_DETAILS_EXCEPTION"               : "excepção",
    "UI_DETAILS_FUNCTION"                : "função",
    "UI_NO_MORE_INSPECTION"              : "Não pode inspeccionar este objecto mais afundo.",
    "UI_ITEMS_TRUNCATED_FROM_LOG"        : "{0} dos itens deste objecto foram truncados a partir do registo.",
    "UI_KEYS_TRUNCATED_FROM_LOG"         : "{0} das chaves deste objecto foram truncadas a partir do registo.",
    "UI_DEFAULT_TIME_FORMAT"             : "h:mm:ss.SSS",

    //Panel
    "PANEL_LOG"                          : "Registo",

    //Node errors
    "NODE_THESEUS_VERSION_ERROR_HEADER"  : "Theseus: Versão de Software Inválida",
    "NODE_THESEUS_VERSION_ERROR_TEXT_1"  : "A extensão Theseus acabou de se conectar a um processo do Node.js iniciado com node-theseus. Infelizmente, a versão do node-theseus utilizada não é compatível com esta versão do Theseus. Devia actualizar ambas para as versões mais recentes. (Theseus: {theseus version}, fondue: {fondue version})",
    "NODE_THESEUS_VERSION_ERROR_CONFIRM" : "Confirmar",

    //Installation corrupt
    "INSTALLATION_CORRUPT_HEADER"        : "Theseus: Instalação Corrompida",
    "INSTALLATION_CORRUPT_TEXT_1"        : "O Theseus aparenta ter ficheiros em falta. Por favor reinstale o Theseus. Se o instalou utilizando um URL do GitHub, por favor siga as instruções de instação no site do Theseus em vez dessas.",
    "INSTALLATION_CORRUPT_CONFIRM"       : "Confirmar",

    //Menu
    "MENU_MODE"                          : "Modo:",
    "MENU_MODE_STATIC_DISPLAYNAME"       : "Servir ficheiros a partir do disco",
    "MENU_MODE_PROXY_DISPLAYNAME"        : "Proxy para o localhost:3000 (experimental)",

    "MENU_NAME_THESEUS_WELCOME_SCREEN"   : "Ecrã de Boas-Vindas do Theseus...",
    "MENU_NAME_THESEUS_TROUBLESHOOTING"  : "Resolução de problemas do Theseus...",
    "MENU_NAME_THESEUS_ENABLE"           : "Ativar Theseus",
    "MENU_NAME_THESEUS_DEBUG_BRACKETS"   : "Fazer Debug no Brackets com o Theseus",
    "MENU_NAME_THESEUS_RESET_TRACE"      : "Fazer Reset aos Dados Rastreados do Theseus (experimental)",

    //Notifications
    "NOTIFICATION_LIVE_DEV_WITH_THESEUS" : "Desenvolvimento ao vivo iniciado com o Theseus no modo {0} .",

    //New version
    "NEW_VERSION_AVAILABLE_HEADER"       : "Actualização para o Theseus disponível!",
    "NEW_VERSION_AVAILABLE_IGNORE"       : "Ignorar",
    "NEW_VERSION_AVAILABLE_UPDATE"       : "Actualizar"
});
