package com.noor.tv;

import android.app.admin.DeviceAdminReceiver;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;

/**
 * Optional device admin with only "force lock". When enabled (adb shell dpm set-active-admin com.noor.tv/.SleepAdmin),
 * Noor's «Screen off» card and "turn the screen off again after the adhan" really put the box to sleep, and over
 * HDMI-CEC the TV follows. Without it Noor falls back to its black Night mode.
 */
public class SleepAdmin extends DeviceAdminReceiver {
    static boolean active(Context c) {
        return c.getSystemService(DevicePolicyManager.class).isAdminActive(new ComponentName(c, SleepAdmin.class));
    }

    static boolean sleep(Context c) {
        if (!active(c)) return false;
        try {
            c.getSystemService(DevicePolicyManager.class).lockNow();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
