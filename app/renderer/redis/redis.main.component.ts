import { Component, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TreeModel, TreeNode, TREE_ACTIONS } from 'angular2-tree-component';

import { Profile, RedisServer, RedisDatabase } from './model/profile';
import { RedisTypes } from './model/redisTypes';
import { ExpandableViewModel, ExpandableViewModelGeneric, TreeItemType } from './viewmodels/expandableViewModel';
import { RedisKeyViewModel } from './viewmodels/redisKeyViewModel';
import { ReliableRedisClient } from './model/reliableRedisClient';
import { UserPreferencesRepository } from './model/userPreferencesRepository';

@Component({
  templateUrl: './redis/redis.main.component.view.html',
  providers: [ReliableRedisClient, UserPreferencesRepository]
})


export class RedisMainComponent {
  private ngZone: NgZone;
  private route: ActivatedRoute;
  private userPreferencesRepository: UserPreferencesRepository;
  private currentProfile: Profile;

  router: Router;
  nodes: ExpandableViewModel[] = [];
  redis: ReliableRedisClient;
  keyVmList: RedisKeyViewModel[] = [];
  selectedKeyVm: RedisKeyViewModel = null;
  selectedKeyVmIndex: number;
  JSON: object;
  _: object;
  RedisTypes: object;
  TreeItemType: object;
  options: object = {
    //nodeHeight: 17,
    useVirtualScroll: true,
     nodeHeight: (node: TreeNode) => 17,
     dropSlotHeight: 0
  };

  constructor(
    router: Router,
    route: ActivatedRoute,
    redis: ReliableRedisClient,
    ngZone: NgZone,
    userPreferencesRepository: UserPreferencesRepository) {
    this.redis = redis;
    this.ngZone = ngZone;
    this.route = route;
    this.userPreferencesRepository = userPreferencesRepository;
    this.JSON = JSON;
    this._ = _;
    this.RedisTypes = RedisTypes;
    this.TreeItemType = TreeItemType;

    let currentProfile = this.userPreferencesRepository.getCurrentProfile();
    this.currentProfile = currentProfile;

    let newServer = <RedisServer>route.params.value;

    this.nodes = _.map(this.currentProfile.servers, server => new ExpandableViewModel(TreeItemType.Server, server.host));
  }

  onSelectedKeyVmChanged = ($event: any): void => {
    this.selectedKeyVm = this.keyVmList[$event.index];
  }

  onEvent = ($event) => console.log($event);
  onToggleExpanded = ($event) => {
    this.getSubItems($event.node);
  };

  onActivate = ($event) => {
    $event.node.data.isExpanded = true;
    $event.node.toggleExpanded();
  };

  onDeactivate = ($event) => {
    $event.node.data.isExpanded = false;
    //  $event.node.toggleCollapsed();
  };

  private async getSubItems(node: any) {
    let vm = <ExpandableViewModel>node.data;
    console.log(`getting subitems for type: ${TreeItemType[vm.type]}`)
    switch (vm.type) {
      case TreeItemType.Server:
        this.displayServerSubItems(node, vm);
        break;

      case TreeItemType.Database:
        this.displayDatabaseSubItems(node, vm);
        break;

      case TreeItemType.Key:
        this.displayKey(vm);
        break;
    }
  }

  private displayServerSubItems(node: any, vm: ExpandableViewModel) {
    vm.children.length = 0;
    _.map(_.range(0, 10 + 1, 1), each => {
      let db = new RedisDatabase();
      db.name = each.toString();
      db.number = each;
      vm.children.push(new ExpandableViewModelGeneric<RedisDatabase>(db, TreeItemType.Database, db.name))
    });
    node.treeModel.update();
  }

  private async displayDatabaseSubItems(node: any, vm: ExpandableViewModel) {
    let db = <ExpandableViewModelGeneric<RedisDatabase>>vm;

    let keys = await this.redis.keysAsync(db.model.number);
    console.log(`number of keys loaded from db '${db.model.number}' is ${_.isNil(keys) ? 0 : keys.length}`);
    vm.children.length = 0;
    
    _.map(keys, key => {
      db.children.push(new ExpandableViewModel(TreeItemType.Key, key));
    });

    this.ngZone.run(() => { node.treeModel.update(); });
  }

  private displayKey(vm: ExpandableViewModel) {
    if (_.some(this.keyVmList, x => x.name === vm.name)) {
      this.selectedKeyVmIndex = _.indexOf(this.keyVmList, _.find(this.keyVmList, x => x.name === vm.name));
      return;
    }

    let keyVm = new RedisKeyViewModel(this.redis, vm.name, 0);
    _.forEach(this.keyVmList, each => each.isActive = false);
    keyVm.isActive = true;
    keyVm.loadDetailsAsync();



    this.selectedKeyVmIndex = this.keyVmList.length;
    console.log(`selected Key ${this.selectedKeyVmIndex}`)

    this.ngZone.run(() => this.keyVmList.push(keyVm));
  }
}