### 问题描述

快速切换显示的Skia组件内容，一定概率崩溃。且有一定概率不显示文本内容。

崩溃时log：

```
06-18 15:10:35.814   23615-23748   A0BEEF/com.exa...ony/#RNOH_CPP  com.example.harmony   E     __█__ HarmonyOpenGLHelper.h:249> liwang c++ testlog: swapBuffers success
06-18 15:10:35.818   23615-23748   A0BEEF/com.exa...ony/#RNOH_CPP  com.example.harmony   E     __█__ HarmonyOpenGLHelper.h:249> liwang c++ testlog: swapBuffers success
06-18 15:10:35.942   23615-23615   C0393D/com.exa...AceNativeNode  com.example.harmony   E     [(-2:100000:singleton)] NotifyResetComponentAsyncEvent kind:15 EMPTY IMPLEMENT
06-18 15:10:35.948   23615-23615   C01400/com.exa...OpenGLWrapper  com.example.harmony   E     EGLSurface is invalid.
06-18 15:10:35.955   23615-23748   A0BEEF/com.exa...ony/#RNOH_CPP  com.example.harmony   E     __█__ HarmonyOpenGLHelper.h:249> liwang c++ testlog: swapBuffers success
06-18 15:10:35.961   23615-23748   A0BEEF/com.exa...ony/#RNOH_CPP  com.example.harmony   E     __█__ HarmonyOpenGLHelper.h:249> liwang c++ testlog: swapBuffers success
06-18 15:10:36.087   23615-23615   C0393D/com.exa...AceNativeNode  com.example.harmony   E     [(-2:100000:singleton)] NotifyResetComponentAsyncEvent kind:15 EMPTY IMPLEMENT
06-18 15:10:36.088   23615-23615   C01400/com.exa...OpenGLWrapper  com.example.harmony   E     EGLSurface is invalid.
06-18 15:10:36.100   23615-23748   A0BEEF/com.exa...ony/#RNOH_CPP  com.example.harmony   E     __█__ HarmonyOpenGLHelper.h:249> liwang c++ testlog: swapBuffers success
06-18 15:10:36.106   23615-23748   A0BEEF/com.exa...ony/#RNOH_CPP  com.example.harmony   E     __█__ HarmonyOpenGLHelper.h:249> liwang c++ testlog: swapBuffers success
06-18 15:10:36.116   23615-23748   A0BEEF/com.exa...ony/#RNOH_CPP  com.example.harmony   E     __█__ HarmonyOpenGLHelper.h:249> liwang c++ testlog: swapBuffers success
06-18 15:10:36.222   23615-23615   C0393D/com.exa...AceNativeNode  com.example.harmony   E     [(-2:100000:singleton)] NotifyResetComponentAsyncEvent kind:15 EMPTY IMPLEMENT
06-18 15:10:36.223   23615-23615   C03F00/MUSL-SIGCHAIN            com.example.harmony   E     signal_chain_handler call 2 rd sigchain action for signal: 5 sca_sigaction=5a9795e0e8 noreturn=0 FREEZE_signo_5 thread_list_lock_status:-1 tl_lock_count=0 tl_lock_waiters=0 tl_lock_tid_fail=-1 tl_lock_count_tid=659 tl_lock_count_fail=-10000 tl_lock_count_tid_sub=659 thread_list_lock_after_lock=23698 thread_list_lock_pre_unlock=23698 thread_list_lock_pthread_exit=24210 thread_list_lock_tid_overlimit=-1 tl_lock_unlock_count=0 __pthread_gettid_np_tl_lock=0 __pthread_exit_tl_lock=0 __pthread_create_tl_lock=0 __pthread_key_delete_tl_lock=0 __synccall_tl_lock=0 __membarrier_tl_lock=0 install_new_tls_tl_lock=0 set_syscall_hooks_tl_lock=0 set_syscall_hooks_linux_tl_lock=0 fork_tl_lock=0 register_count=0 
06-18 15:10:36.941   23615-23615   C03F00/MUSL-SIGCHAIN            com.example.harmony   E     signal_chain_handler call usr sigaction for signal: 5 sig_action.sa_sigaction=5b1f130040
06-18 15:10:36.941   23615-23615   C03F00/MUSL-SIGCHAIN            com.example.harmony   E     signal_chain_handler call 2 rd sigchain action for signal: 5 sca_sigaction=5a9795e0e8 noreturn=0 FREEZE_signo_5 thread_list_lock_status:-1 tl_lock_count=0 tl_lock_waiters=0 tl_lock_tid_fail=-1 tl_lock_count_tid=659 tl_lock_count_fail=-10000 tl_lock_count_tid_sub=659 thread_list_lock_after_lock=23668 thread_list_lock_pre_unlock=23668 thread_list_lock_pthread_exit=24212 thread_list_lock_tid_overlimit=-1 tl_lock_unlock_count=0 __pthread_gettid_np_tl_lock=0 __pthread_exit_tl_lock=0 __pthread_create_tl_lock=0 __pthread_key_delete_tl_lock=0 __synccall_tl_lock=0 __membarrier_tl_lock=0 install_new_tls_tl_lock=0 set_syscall_hooks_tl_lock=0 set_syscall_hooks_linux_tl_lock=0 fork_tl_lock=0 register_count=0 
06-18 15:10:36.941   23615-23615   C03F00/MUSL-SIGCHAIN            com.example.harmony   E     signal_chain_handler call usr sigaction for signal: 5 sig_action.sa_sigaction=5b1a8d8a7c
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     41:operator():314 <<<=== ffrt black box(BBOX) start ===>>>
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     42:SaveCurrent:73 <<<=== current status ===>>>
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     43:SaveWorkerStatus:117 <<<=== worker status ===>>>
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     44:SaveWorkerStatus:124 qos 2: worker tid 24142 is running nothing
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     45:SaveWorkerStatus:124 qos 2: worker tid 24140 is running nothing
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     46:SaveWorkerStatus:124 qos 3: worker tid 24235 is running nothing
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     47:SaveWorkerStatus:124 qos 3: worker tid 23668 is running nothing
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     48:SaveWorkerStatus:124 qos 4: worker tid 24139 is running nothing
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     49:SaveWorkerStatus:124 qos 4: worker tid 24138 is running nothing
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     50:SaveWorkerStatus:124 qos 4: worker tid 24137 is running nothing
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     51:SaveKeyStatus:160 <<<=== key status ===>>>
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     52:SaveKeyStatus:162 no key status
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     53:SaveReadyQueueStatus:137 <<<=== ready queue status ===>>>
06-18 15:10:36.945   23615-24238   C01719/com.exa....harmony/ffrt  com.example.harmony   E     54:operator():324 <<<=== ffrt black box(BBOX) finish ===>>>
06-18 15:10:36.946   23615-23615   C03F00/MUSL-SIGCHAIN            com.example.harmony   E     signal_chain_handler call 2 rd sigchain action for signal: 5 sca_sigaction=5a9795e0e8 noreturn=0 FREEZE_signo_5 thread_list_lock_status:-1 tl_lock_count=0 tl_lock_waiters=0 tl_lock_tid_fail=-1 tl_lock_count_tid=659 tl_lock_count_fail=-10000 tl_lock_count_tid_sub=659 thread_list_lock_after_lock=23615 thread_list_lock_pre_unlock=23615 thread_list_lock_pthread_exit=24212 thread_list_lock_tid_overlimit=-1 tl_lock_unlock_count=0 __pthread_gettid_np_tl_lock=0 __pthread_exit_tl_lock=0 __pthread_create_tl_lock=0 __pthread_key_delete_tl_lock=0 __synccall_tl_lock=0 __membarrier_tl_lock=0 install_new_tls_tl_lock=0 set_syscall_hooks_tl_lock=0 set_syscall_hooks_linux_tl_lock=0 fork_tl_lock=0 register_count=0 
06-18 15:10:36.946   23615-23615   C03F00/MUSL-SIGCHAIN            com.example.harmony   E     signal_chain_handler SIG_DFL handler for signal: 5
06-18 15:10:36.946   23615-23615   C03F00/MUSL-SIGCHAIN            com.example.harmony   E     pid(23615) rethrow sig(5) success.
```





### 版本信息

见工程

