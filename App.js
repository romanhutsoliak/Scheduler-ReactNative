import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { locale } from 'expo-localization';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, SafeAreaView, Platform, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuid_v4 } from 'uuid';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const [userDevice, setUserDevice] = useState(null);

  const webViewRef = useRef();

  const handleBackButtonPress = () => {
    try {
      webViewRef.current?.goBack();
    } catch (err) {
      console.log('[handleBackButtonPress] Error : ', err.message);
    }
  };

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.notification.request.content.data.url &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      Linking.openURL(
        lastNotificationResponse.notification.request.content.data.url
      );
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    // don't show webview until we have user device
    getUserDeviceData().then((userDeviceData) => {
      setUserDevice(userDeviceData);
    });

    registerForPushNotificationsAsync().then((token) => {
      // Send the token to react
      setTimeout(() => {
        webViewRef.current.injectJavaScript(`
          window.dispatchEvent(new CustomEvent("message_from_react_native", {detail: {action: "notificationToken", data: "${token}"}}));
          true; 
        `);
      }, 500);
    });

    BackHandler.addEventListener('hardwareBackPress', handleBackButtonPress);

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('addNotificationReceivedListener');
        // console.log(notification);
      });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('addNotificationResponseReceivedListener2');
        console.log(response);
        let redirectTo =
          response.notification.request.content.data.redirectTo ?? undefined;
        if (redirectTo) {
          webViewRef.current.injectJavaScript(`
            window.location.href = '${redirectTo}';
            true;
          `);
        }
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);
      BackHandler.removeEventListener(
        'hardwareBackPress',
        handleBackButtonPress
      );
    };
  }, []);

  const webviewUrl =
    Constants.manifest?.extra?.WEBVIEW_URL ||
    process.env.WEBVIEW_URL ||
    'http://192.168.1.3:3003';

  return userDevice ? (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{
          uri: webviewUrl
        }}
        ref={webViewRef}
        onMessage={(event) => {
          // Debug react web code in native console
          console.log(event.nativeEvent.data);
        }}
        startInLoadingState={true}
        javaScriptEnabled={true}
        javaScriptEnabledAndroid={true}
        originWhitelist={['*']}
        injectedJavaScriptBeforeContentLoaded={
          `
          window.isNativeApp = true;
          window.userDevice = ` +
          JSON.stringify(userDevice) +
          `;
          true;
        `
        }
      />
    </SafeAreaView>
  ) : (
    <></>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30
  }
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C'
    });
  }

  return token;
}

async function getUserDeviceData() {
  let deviceId = '';
  if (Platform.OS === 'android') {
    deviceId = Application.androidId;
  } else {
    deviceId = await SecureStore.getItemAsync('deviceId');

    if (!deviceId) {
      deviceId = Constants.deviceId ?? uuid_v4();
      await SecureStore.setItemAsync('deviceId', deviceId);
    }
  }
  return {
    deviceId: deviceId,
    platform: Platform.OS,
    manufacturer: Device.manufacturer,
    model: Device.deviceName,
    appVersion: '1.0.0',
    locale: locale
  };
}
