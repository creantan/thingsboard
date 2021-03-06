/*
 * Copyright © 2016 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable import/no-unresolved, import/default */

import addDashboardTemplate from './add-dashboard.tpl.html';
import dashboardCard from './dashboard-card.tpl.html';
import assignToCustomerTemplate from './assign-to-customer.tpl.html';
import addDashboardsToCustomerTemplate from './add-dashboards-to-customer.tpl.html';

/* eslint-enable import/no-unresolved, import/default */

/*@ngInject*/
export default function DashboardsController(userService, dashboardService, customerService, $scope, $controller, $state, $stateParams, $mdDialog, $document, $q, $translate) {

    var customerId = $stateParams.customerId;

    var dashboardActionsList = [
        {
            onAction: function ($event, item) {
                vm.grid.openItem($event, item);
            },
            name: function() { return $translate.instant('dashboard.details') },
            details: function() { return $translate.instant('dashboard.dashboard-details') },
            icon: "edit"
        }
    ];

    var dashboardGroupActionsList = [];

    var vm = this;

    vm.dashboardGridConfig = {
        deleteItemTitleFunc: deleteDashboardTitle,
        deleteItemContentFunc: deleteDashboardText,
        deleteItemsTitleFunc: deleteDashboardsTitle,
        deleteItemsActionTitleFunc: deleteDashboardsActionTitle,
        deleteItemsContentFunc: deleteDashboardsText,

        saveItemFunc: saveDashboard,

        clickItemFunc: openDashboard,

        getItemTitleFunc: getDashboardTitle,
        itemCardTemplateUrl: dashboardCard,

        actionsList: dashboardActionsList,
        groupActionsList: dashboardGroupActionsList,

        onGridInited: gridInited,

        addItemTemplateUrl: addDashboardTemplate,

        addItemText: function() { return $translate.instant('dashboard.add-dashboard-text') },
        noItemsText: function() { return $translate.instant('dashboard.no-dashboards-text') },
        itemDetailsText: function() { return $translate.instant('dashboard.dashboard-details') },
        isDetailsReadOnly: function () {
            return vm.dashboardsScope === 'customer_user';
        },
        isSelectionEnabled: function () {
            return !(vm.dashboardsScope === 'customer_user');
        }
    };

    if (angular.isDefined($stateParams.items) && $stateParams.items !== null) {
        vm.dashboardGridConfig.items = $stateParams.items;
    }

    if (angular.isDefined($stateParams.topIndex) && $stateParams.topIndex > 0) {
        vm.dashboardGridConfig.topIndex = $stateParams.topIndex;
    }

    vm.dashboardsScope = $state.$current.data.dashboardsType;

    vm.assignToCustomer = assignToCustomer;
    vm.unassignFromCustomer = unassignFromCustomer;

    initController();

    function initController() {
        var fetchDashboardsFunction = null;
        var deleteDashboardFunction = null;
        var refreshDashboardsParamsFunction = null;

        var user = userService.getCurrentUser();

        if (user.authority === 'CUSTOMER_USER') {
            vm.dashboardsScope = 'customer_user';
            customerId = user.customerId;
        }

        if (vm.dashboardsScope === 'tenant') {
            fetchDashboardsFunction = function (pageLink) {
                return dashboardService.getTenantDashboards(pageLink);
            };
            deleteDashboardFunction = function (dashboardId) {
                return dashboardService.deleteDashboard(dashboardId);
            };
            refreshDashboardsParamsFunction = function () {
                return {"topIndex": vm.topIndex};
            };

            dashboardActionsList.push(
                {
                    onAction: function ($event, item) {
                        assignToCustomer($event, [ item.id.id ]);
                    },
                    name: function() { return $translate.instant('action.assign') },
                    details: function() { return $translate.instant('dashboard.assign-to-customer') },
                    icon: "assignment_ind"
                }
            );

            dashboardActionsList.push(
                {
                    onAction: function ($event, item) {
                        vm.grid.deleteItem($event, item);
                    },
                    name: function() { return $translate.instant('action.delete') },
                    details: function() { return $translate.instant('dashboard.delete') },
                    icon: "delete"
                }
            );

            dashboardGroupActionsList.push(
                    {
                        onAction: function ($event, items) {
                            assignDashboardsToCustomer($event, items);
                        },
                        name: function() { return $translate.instant('dashboard.assign-dashboards') },
                        details: function(selectedCount) {
                            return $translate.instant('dashboard.assign-dashboards-text', {count: selectedCount}, "messageformat");
                        },
                        icon: "assignment_ind"
                    }
            );

            dashboardGroupActionsList.push(
                {
                    onAction: function ($event) {
                        vm.grid.deleteItems($event);
                    },
                    name: function() { return $translate.instant('dashboard.delete-dashboards') },
                    details: deleteDashboardsActionTitle,
                    icon: "delete"
                }
            );


        } else if (vm.dashboardsScope === 'customer' || vm.dashboardsScope === 'customer_user') {
            fetchDashboardsFunction = function (pageLink) {
                return dashboardService.getCustomerDashboards(customerId, pageLink);
            };
            deleteDashboardFunction = function (dashboardId) {
                return dashboardService.unassignDashboardFromCustomer(dashboardId);
            };
            refreshDashboardsParamsFunction = function () {
                return {"customerId": customerId, "topIndex": vm.topIndex};
            };

            if (vm.dashboardsScope === 'customer') {
                dashboardActionsList.push(
                    {
                        onAction: function ($event, item) {
                            unassignFromCustomer($event, item);
                        },
                        name: function() { return $translate.instant('action.unassign') },
                        details: function() { return $translate.instant('dashboard.unassign-from-customer') },
                        icon: "assignment_return"
                    }
                );

                dashboardGroupActionsList.push(
                    {
                        onAction: function ($event, items) {
                            unassignDashboardsFromCustomer($event, items);
                        },
                        name: function() { return $translate.instant('dashboard.unassign-dashboards') },
                        details: function(selectedCount) {
                            return $translate.instant('dashboard.unassign-dashboards-action-title', {count: selectedCount}, "messageformat");
                        },
                        icon: "assignment_return"
                    }
                );


                vm.dashboardGridConfig.addItemAction = {
                    onAction: function ($event) {
                        addDashboardsToCustomer($event);
                    },
                    name: function() { return $translate.instant('dashboard.assign-dashboards') },
                    details: function() { return $translate.instant('dashboard.assign-new-dashboard') },
                    icon: "add"
                };
            } else if (vm.dashboardsScope === 'customer_user') {
                vm.dashboardGridConfig.addItemAction = {};
            }
        }

        vm.dashboardGridConfig.refreshParamsFunc = refreshDashboardsParamsFunction;
        vm.dashboardGridConfig.fetchItemsFunc = fetchDashboardsFunction;
        vm.dashboardGridConfig.deleteItemFunc = deleteDashboardFunction;

    }

    function deleteDashboardTitle (dashboard) {
        return $translate.instant('dashboard.delete-dashboard-title', {dashboardTitle: dashboard.title});
    }

    function deleteDashboardText () {
        return $translate.instant('dashboard.delete-dashboard-text');
    }

    function deleteDashboardsTitle (selectedCount) {
        return $translate.instant('dashboard.delete-dashboards-title', {count: selectedCount}, 'messageformat');
    }

    function deleteDashboardsActionTitle(selectedCount) {
        return $translate.instant('dashboard.delete-dashboards-action-title', {count: selectedCount}, 'messageformat');
    }

    function deleteDashboardsText () {
        return $translate.instant('dashboard.delete-dashboards-text');
    }

    function gridInited(grid) {
        vm.grid = grid;
    }

    function getDashboardTitle(dashboard) {
        return dashboard ? dashboard.title : '';
    }

    function saveDashboard(dashboard) {
        return dashboardService.saveDashboard(dashboard);
    }

    function assignToCustomer($event, dashboardIds) {
        if ($event) {
            $event.stopPropagation();
        }
        var pageSize = 10;
        customerService.getCustomers({limit: pageSize, textSearch: ''}).then(
            function success(_customers) {
                var customers = {
                    pageSize: pageSize,
                    data: _customers.data,
                    nextPageLink: _customers.nextPageLink,
                    selection: null,
                    hasNext: _customers.hasNext,
                    pending: false
                };
                if (customers.hasNext) {
                    customers.nextPageLink.limit = pageSize;
                }
                $mdDialog.show({
                    controller: 'AssignDashboardToCustomerController',
                    controllerAs: 'vm',
                    templateUrl: assignToCustomerTemplate,
                    locals: {dashboardIds: dashboardIds, customers: customers},
                    parent: angular.element($document[0].body),
                    fullscreen: true,
                    targetEvent: $event
                }).then(function () {
                    vm.grid.refreshList();
                }, function () {
                });
            },
            function fail() {
            });
    }

    function addDashboardsToCustomer($event) {
        if ($event) {
            $event.stopPropagation();
        }
        var pageSize = 10;
        dashboardService.getTenantDashboards({limit: pageSize, textSearch: ''}).then(
            function success(_dashboards) {
                var dashboards = {
                    pageSize: pageSize,
                    data: _dashboards.data,
                    nextPageLink: _dashboards.nextPageLink,
                    selections: {},
                    selectedCount: 0,
                    hasNext: _dashboards.hasNext,
                    pending: false
                };
                if (dashboards.hasNext) {
                    dashboards.nextPageLink.limit = pageSize;
                }
                $mdDialog.show({
                    controller: 'AddDashboardsToCustomerController',
                    controllerAs: 'vm',
                    templateUrl: addDashboardsToCustomerTemplate,
                    locals: {customerId: customerId, dashboards: dashboards},
                    parent: angular.element($document[0].body),
                    fullscreen: true,
                    targetEvent: $event
                }).then(function () {
                    vm.grid.refreshList();
                }, function () {
                });
            },
            function fail() {
            });
    }

    function assignDashboardsToCustomer($event, items) {
        var dashboardIds = [];
        for (var id in items.selections) {
            dashboardIds.push(id);
        }
        assignToCustomer($event, dashboardIds);
    }

    function unassignFromCustomer($event, dashboard) {
        if ($event) {
            $event.stopPropagation();
        }
        var confirm = $mdDialog.confirm()
            .targetEvent($event)
            .title($translate.instant('dashboard.unassign-dashboard-title', {dashboardTitle: dashboard.title}))
            .htmlContent($translate.instant('dashboard.unassign-dashboard-text'))
            .ariaLabel($translate.instant('dashboard.unassign-dashboard'))
            .cancel($translate.instant('action.no'))
            .ok($translate.instant('action.yes'));
        $mdDialog.show(confirm).then(function () {
            dashboardService.unassignDashboardFromCustomer(dashboard.id.id).then(function success() {
                vm.grid.refreshList();
            });
        });
    }

    function unassignDashboardsFromCustomer($event, items) {
        var confirm = $mdDialog.confirm()
            .targetEvent($event)
            .title($translate.instant('dashboard.unassign-dashboards-title', {count: items.selectedCount}, 'messageformat'))
            .htmlContent($translate.instant('dashboard.unassign-dashboards-text'))
            .ariaLabel($translate.instant('dashboard.unassign-dashboards'))
            .cancel($translate.instant('action.no'))
            .ok($translate.instant('action.yes'));
        $mdDialog.show(confirm).then(function () {
            var tasks = [];
            for (var id in items.selections) {
                tasks.push(dashboardService.unassignDashboardFromCustomer(id));
            }
            $q.all(tasks).then(function () {
                vm.grid.refreshList();
            });
        });
    }

    function openDashboard($event, dashboard) {
        if ($event) {
            $event.stopPropagation();
        }
        if (vm.dashboardsScope === 'customer') {
            $state.go('home.customers.dashboards.dashboard', {
                customerId: customerId,
                dashboardId: dashboard.id.id
            });
        } else {
            $state.go('home.dashboards.dashboard', {dashboardId: dashboard.id.id});
        }
    }
}
